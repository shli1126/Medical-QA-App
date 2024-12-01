package api

import (
	"backend/internal/api/handlers"

	"github.com/gorilla/mux"
)

func SetupRoutes() *mux.Router {
	r := mux.NewRouter()

	r.HandleFunc("/conversation/new", handlers.NewConversation).Methods("POST")
	r.HandleFunc("/conversation/{id}", handlers.HandleMessage).Methods("POST")
	r.HandleFunc("/conversation/{id}", handlers.GetConversation).Methods("GET")

	return r
}
