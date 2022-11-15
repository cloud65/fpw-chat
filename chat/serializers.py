import base64
from rest_framework.serializers import *
from django.contrib.auth.models import AnonymousUser  
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from .models import *

class BinaryField(Field):
    def to_representation(self, value):
        return base64.b64encode(value.image)

    def to_internal_value(self, data):
        return base64.b64decode(data)


class UserSerializer(Serializer):
    id = IntegerField(required=False)
    first_name = CharField(required=False)
    username = CharField(required=False)
    last_name = CharField(required=False)
    email = CharField(required=False)
    password = CharField(required=False)
    new_password = CharField(required=False)
    avatar = BinaryField(required=False)

    def to_representation(self, instance):
        if isinstance(instance, AnonymousUser):
            return {}
        rep = super().to_representation(instance)
        rep.pop('password', None)
        return rep
    
    def update(self, instance, data):
        new_password = data.get('new_password')
        password = data.get('password')
        if password and new_password:
            if instance.check_password(password):
                instance.set_password(new_password)
            else:
                error = {'error': 'Неверный пароль'}
                raise ValidationError(error) 
            
        instance.first_name = data.get('first_name', instance.first_name)
        instance.last_name = data.get('last_name', instance.last_name)
        instance.email = data.get('email', instance.email)
        instance.save()
        
        avatar = data.get('avatar', None)
        if avatar:
            try:        
                instance.avatar.image=avatar
                instance.avatar.save()
            except ObjectDoesNotExist:
                obj = Avatar.objects.create(user = instance, image=avatar)
        
        return instance
        

class ChatSerializer(ModelSerializer):
    class Meta:
        model = Chat
        fields = ['id', 'user', 'name', 'description']
        
class PrivateSerializer(ModelSerializer):
    class Meta:
        model = Private
        fields = ['user_from', 'user_to', 'date', 'message']
        
class PublicSerializer(ModelSerializer):
    class Meta:
        model = Public
        fields = ['user', 'chat', 'date', 'message']
        

class UserListSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']        


def get_users_list(users_id):
    users = list()
    for user in User.objects.filter(id__in=users_id):
        user_dict = UserSerializer(user).data
        user_dict['id'] = user.id
        user_dict.pop('email')
        try:
            user_dict['avatar'] = base64.b64encode(user.avatar.image)
        except Avatar.DoesNotExist:
            user_dict['avatar'] = None
        users.append(user_dict)
    return users