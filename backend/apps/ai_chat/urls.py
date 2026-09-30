from django.urls import path
from .views import ChatbotAPIView

urlpatterns = [
    path("chatbot/", ChatbotAPIView.as_view()),
    path("api/chatbot/", ChatbotAPIView.as_view()),
]