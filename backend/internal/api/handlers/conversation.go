package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"

	"backend/internal/db"
	"backend/internal/models"

	"github.com/gorilla/mux"
)

func NewConversation(w http.ResponseWriter, r *http.Request) {
	// Check if last conversation exists and has no messages
	lastConv, err := db.GetLastConversation()
	if err == nil {
		// Check if this conversation has any messages
		hasMessages := len(lastConv.Messages) > 0
		if !hasMessages {
			// Return existing empty conversation
			json.NewEncoder(w).Encode(map[string]int{"id": lastConv.ID})
			return
		}
	}

	// Create new conversation if last one has messages or doesn't exist
	conversation := models.Conversation{}
	err = db.CreateConversation(&conversation)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]int{"id": conversation.ID})
}

func HandleMessage(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Run Python script for RAG and LLM processing
	cmd := exec.Command("python", "rag/rag_langchain.py", "--query", input.Message, "--api_path", "./openai_api.txt")

	// Create pipes for both stdout and stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Println("Error creating stdout pipe:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		fmt.Println("Error creating stderr pipe:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := cmd.Start(); err != nil {
		fmt.Println("Error starting Python script:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Read both stdout and stderr
	stdoutBytes, _ := io.ReadAll(stdout)
	stderrBytes, _ := io.ReadAll(stderr)

	if err := cmd.Wait(); err != nil {
		fmt.Printf("Error running Python script: %v\nStdout: %s\nStderr: %s\n",
			err, string(stdoutBytes), string(stderrBytes))
		http.Error(w, fmt.Sprintf("Error: %v\nDetails: %s", err, string(stderrBytes)),
			http.StatusInternalServerError)
		return
	}

	// Log the output
	fmt.Printf("Python Script Output:\nStdout: %s\nStderr: %s\n",
		string(stdoutBytes), string(stderrBytes))

	// Read the response from the output file
	output, err := os.ReadFile("rag/output.txt")
	if err != nil {
		fmt.Println("Error reading output file:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := string(output)

	// Save conversation to database
	id := mux.Vars(r)["id"]
	err = db.SaveMessage(id, input.Message, response)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"response": response})
}

func GetConversation(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid conversation ID", http.StatusBadRequest)
		return
	}

	conversation, err := db.GetConversation(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Conversation not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	json.NewEncoder(w).Encode(conversation)
}

func GetRecentConversations(w http.ResponseWriter, r *http.Request) {
	currentIDStr := r.URL.Query().Get("currentId")
	if currentIDStr == "" {
		http.Error(w, "currentId parameter is required", http.StatusBadRequest)
		return
	}

	currentID, err := strconv.Atoi(currentIDStr)
	if err != nil {
		fmt.Printf("Error converting currentId to int: %v\n", err)
		http.Error(w, "Invalid current ID", http.StatusBadRequest)
		return
	}

	conversations, err := db.GetRecentConversations(currentID, 5)
	if err != nil {
		fmt.Printf("Error getting recent conversations: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(conversations); err != nil {
		fmt.Printf("Error encoding response: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
