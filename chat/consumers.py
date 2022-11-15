from datetime import datetime
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import *

@sync_to_async
def save_public_message(chat_id, user, date, message): 
    print(message)   
    return Public.objects.create(
                chat=Chat.objects.get(pk=int(chat_id)), 
                user=user, 
                date=date, 
                message=message
            )

@sync_to_async
def save_private_message(user_id, user, date, message):
    return Private.objects.create(
                user_to=User.objects.get(pk=int(user_id)), 
                user_from=user, 
                date=date,
                message=message
            )             
    

class ChatConsumer(AsyncJsonWebsocketConsumer):
    groups = ["broadcast"]
    
    async def connect(self):
        await self.accept()
        self.user = self.scope["user"]
        self.private_group = f"user_id-{self.user.id}"
        await self.channel_layer.group_add(self.private_group, self.channel_name)
            

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, data): 
        activate = data.get('activate', None)
        if not activate is None:
            group = "".join([f"{key}-{value}" for key, value in activate.items() if value])
            for key in list(self.channel_layer.groups.keys()):
                if key!=group and key!=self.private_group:
                    await self.channel_layer.group_discard(key, self.channel_name)
            if not "user" in group: # Пользователь в должен быть только сам у себя в группе
                await self.channel_layer.group_add(group, self.channel_name)
            return
        message = data.get("message", None)
        if not message:
            return
        
        date_message = datetime.now()
        msg = {"message": message, "user": self.user.id, "date": date_message.strftime('%Y-%m-%d %H:%M:%S')}        
        
        chat_id = data.get('chat')
        user_id = data.get('user')
        if chat_id:
            group_id=f'chat_id-{chat_id}'
            await save_public_message(chat_id, self.user, date_message, message)
        elif user_id:
            group_id=f'user_id-{user_id}'
            msg.update({'private': True})
            await save_private_message(user_id, self.user, date_message, message)
        
        broadcast = {
                "type": "chat_message",
                "data": msg,
                "user": self.user.id
            }                
        await self.channel_layer.group_send(group_id, broadcast)
         

    async def chat_message(self, event):
        #print(event)        
        if self.user.id!=event["user"]:
            await self.send_json(event["data"])