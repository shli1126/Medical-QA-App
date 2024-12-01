package models

type Conversation struct {
	ID       int       `json:"id"`
	Messages []Message `json:"messages"`
}

type Message struct {
	IsUser  bool   `json:"is_user"`
	Content string `json:"content"`
}
