"""main URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from chat.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path("register/", register_request, name="register"),
    
    path('', main_page, name='main_page'),
    
    path('my/', user_profile, name='user_profile'),
    path('my/chats', user_chats, name='user_chats'),
    
    path('users/', users_list, name='users_list'),
    
    path('chats/', chat_api, name='chat_list'),
    path('chats/<int:chat_id>', chat_api, name='chat_detail'),
    
    path('private/<int:user_id>', private_api, name='private_list'),
    
    path('chat/<int:chat_id>', messages_api, name='public_list'),
    
    
]
