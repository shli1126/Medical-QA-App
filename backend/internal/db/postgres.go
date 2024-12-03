package db

import (
	"backend/internal/models"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Initialize(dataSourceName string) {
	var err error
	fmt.Println(dataSourceName)
	DB, err = sql.Open("postgres", dataSourceName)
	if err != nil {
		panic(err)
	}

	if err = DB.Ping(); err != nil {
		panic(err)
	}

	// Create tables if not exists
	_, err = DB.Exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
		
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES conversations(id),
            is_user BOOLEAN,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `)
	if err != nil {
		panic(err)
	}
}

func CreateConversation(conversation *models.Conversation) error {
	query := `INSERT INTO conversations DEFAULT VALUES RETURNING id`
	return DB.QueryRow(query).Scan(&conversation.ID)
}

func SaveMessage(conversationID, userMessage, llmResponse string) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("INSERT INTO messages (conversation_id, is_user, content) VALUES ($1, $2, $3)",
		conversationID, true, userMessage)
	if err != nil {
		return err
	}

	_, err = tx.Exec("INSERT INTO messages (conversation_id, is_user, content) VALUES ($1, $2, $3)",
		conversationID, false, llmResponse)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func GetConversation(id int) (models.Conversation, error) {
	var conversation models.Conversation
	conversation.ID = id

	rows, err := DB.Query("SELECT is_user, content FROM messages WHERE conversation_id = $1 ORDER BY created_at", id)
	if err != nil {
		return conversation, err
	}
	defer rows.Close()

	for rows.Next() {
		var message models.Message
		err := rows.Scan(&message.IsUser, &message.Content)
		if err != nil {
			return conversation, err
		}
		conversation.Messages = append(conversation.Messages, message)
	}

	return conversation, nil
}

func GetLastConversation() (*models.Conversation, error) {
	conversation := &models.Conversation{}
	query := `
        SELECT id FROM conversations 
        ORDER BY id DESC 
        LIMIT 1
    `
	err := DB.QueryRow(query).Scan(&conversation.ID)
	if err != nil {
		return nil, err
	}

	// Get messages for this conversation
	query = `
        SELECT is_user, content 
        FROM messages 
        WHERE conversation_id = $1 
        ORDER BY id
    `
	rows, err := DB.Query(query, conversation.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var isUser bool
		var content string
		if err := rows.Scan(&isUser, &content); err != nil {
			return nil, err
		}
		conversation.Messages = append(conversation.Messages, models.Message{
			IsUser:  isUser,
			Content: content,
		})
	}

	return conversation, nil
}

func GetRecentConversations(currentID int, limit int) ([]models.Conversation, error) {
	query := `
        SELECT DISTINCT c.id 
        FROM conversations c 
        JOIN messages m ON c.id = m.conversation_id 
        WHERE c.id < $1 
        ORDER BY c.id DESC 
        LIMIT $2
    `
	rows, err := DB.Query(query, currentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []models.Conversation
	for rows.Next() {
		var conv models.Conversation
		if err := rows.Scan(&conv.ID); err != nil {
			return nil, err
		}

		// Get first message for preview
		msgQuery := `
            SELECT is_user, content 
            FROM messages 
            WHERE conversation_id = $1 
            ORDER BY id 
            LIMIT 1
        `
		var isUser bool
		var content string
		err = DB.QueryRow(msgQuery, conv.ID).Scan(&isUser, &content)
		if err != nil {
			return nil, err
		}

		conv.Messages = []models.Message{{
			IsUser:  isUser,
			Content: content,
		}}
		conversations = append(conversations, conv)
	}

	return conversations, nil
}
