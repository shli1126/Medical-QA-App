package api

import (
	"backend/internal/api/handlers"

	"github.com/gorilla/mux"
)

func RegisterRoutes() *mux.Router {
	r := mux.NewRouter()
	r.HandleFunc("/conversation/new", handlers.NewConversation).Methods("POST")
	r.HandleFunc("/conversation/recent", handlers.GetRecentConversations).Methods("GET")
	r.HandleFunc("/conversation/{id}/message", handlers.HandleMessage).Methods("POST")
	r.HandleFunc("/conversation/{id}", handlers.GetConversation).Methods("GET")
	return r
}
