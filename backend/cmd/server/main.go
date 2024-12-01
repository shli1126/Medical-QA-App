package main

import (
	"fmt"
	"log"
	"net/http"

	"backend/internal/api"
	"backend/internal/config"
	"backend/internal/db"

	"github.com/rs/cors"
)

func main() {
	cfg := config.Load()
	fmt.Println(cfg.DatabaseURL)
	db.Initialize(cfg.DatabaseURL)

	router := api.SetupRoutes()

	// Create a new CORS handler
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	log.Printf("Server starting on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, handler))
}
