from django.urls import path
from .views import (
    ConversationListAPIView,
    ConversationCreateAPIView,
    ConversationDetailAPIView,
    MessageListAPIView,
    MessageCreateAPIView,
    MarkMessageReadAPIView,
    ChatDirectoryAPIView,
)

urlpatterns = [
    # Conversation REST Routes
    path("conversations/", ConversationListAPIView.as_view(), name="conversation-list"),
    path("conversations/create/", ConversationCreateAPIView.as_view(), name="conversation-create"),
    path("conversations/<uuid:pk>/", ConversationDetailAPIView.as_view(), name="conversation-detail"),
    path("directory/", ChatDirectoryAPIView.as_view(), name="chat-directory"),

    # Message REST Routes
    path("conversations/<uuid:conversation_id>/messages/", MessageListAPIView.as_view(), name="message-list"),
    path("messages/", MessageCreateAPIView.as_view(), name="message-create"),
    path("messages/read/", MarkMessageReadAPIView.as_view(), name="message-mark-read"),
]
