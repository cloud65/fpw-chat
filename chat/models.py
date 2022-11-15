from django.contrib.auth.models import User
from django.db import models


# Create your models here.
class Avatar(models.Model):
    user = models.OneToOneField(User, related_name='avatar', on_delete=models.CASCADE,  primary_key=True )
    image = models.BinaryField()
    
    
class Chat(models.Model):
    user = models.ForeignKey(User, related_name='chats', on_delete=models.CASCADE )
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True)
    
    
class Private(models.Model):
    user_from = models.ForeignKey(User, related_name='private_from', on_delete=models.CASCADE )
    user_to = models.ForeignKey(User, related_name='private_to', on_delete=models.CASCADE )
    date = models.DateTimeField()
    message = models.TextField()
    
class Public(models.Model):
    user = models.ForeignKey(User, related_name='my_messages', on_delete=models.CASCADE )
    chat = models.ForeignKey(Chat, related_name='messages', on_delete=models.CASCADE )
    date = models.DateTimeField()
    message = models.TextField()