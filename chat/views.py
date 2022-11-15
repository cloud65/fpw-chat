import base64
from django.db.models import Q
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import AnonymousUser  
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .serializers import *
from .forms import *

def register_request(request):  # Регистрация и отправка кода
    if request.method == "POST":
        form = NewUserForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = True
            user.save()            
            return redirect(f"/accounts/login?username={user.username}")
    else:
        form = NewUserForm()
    return render(request=request, template_name="registration/register.html",
                  context={"form": form, 'data': request.POST})


def main_page(request): # Главная страница
    return render(request=request, template_name="default.html", context={})
    
    
    
@api_view(['GET', 'POST'])
def user_profile(request):
    if isinstance(request.user, AnonymousUser):
        return HttpResponse(status=403)
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        serializer = UserSerializer(request.user, data=request.data)
        if serializer.is_valid():
            serializer.save()            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
   
def model_api(request, model_id, ModelClass, SerializerClass, check_func=None):
    if isinstance(request.user, AnonymousUser):
        return HttpResponse(status=403)
    instance = None
    if not model_id is None:
        try:
            instance = ModelClass.objects.get(pk=int(model_id))
        except ModelClass.DoesNotExist:
            return HttpResponse(status=404)

    if not check_func is None and not instance is None:
        code = check_func(request, instance)
        if code:
            return HttpResponse(status=code)

    if request.method == 'GET':
        if instance:
            serializer = SerializerClass(instance)
        else:
            serializer = SerializerClass(ModelClass.objects.all(), many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        if instance:
            serializer = SerializerClass(instance, data=request.data)
        else:
            serializer = SerializerClass(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE' and instance:
        instance.delete()
        return Response({'result': True})
        

@api_view(['GET', 'POST', 'DELETE'])
def chat_api(request, chat_id=None):    
    def check(req, chat):
        if chat.user!=req.user:
            return 403
        return None
    if request.method == 'POST':
        request.data['user'] = request.user.id
    chat_id = chat_id or request.data.get('id', None)
    return model_api(request, chat_id, Chat, ChatSerializer, check)


@api_view(['GET'])
def users_list(request): 
    if isinstance(request.user, AnonymousUser):
        return HttpResponse(status=403)
    users_id = request.query_params.get('id')    
    if users_id:
        users = get_users_list(users_id)
    else:
        users = UserListSerializer(User.objects.exclude(id=request.user.id), many=True).data
    return Response(users)
    

@api_view(['GET'])
def user_chats(request):
    if isinstance(request.user, AnonymousUser):
        return HttpResponse(status=403)
    
    msg_chats = Public.objects.filter(user=request.user).values_list('chat')
    query_chats = Chat.objects.filter(Q(user=request.user) | Q(id__in=msg_chats))    
    chats = ChatSerializer(query_chats, many=True)
    for value in chats.data:
        value['is_my'] = value['user']==request.user.id
        
    users = Private.objects.filter(user_to=request.user).values_list('user_from').union(
        Private.objects.filter(user_from=request.user).values_list('user_to'))    
    privates = UserListSerializer(User.objects.filter(id__in=users), many=True)
    
    return Response({'private': privates.data, 'public': chats.data})
    

    
@api_view(['GET'])
def private_api(request, user_id):
    if isinstance(request.user, AnonymousUser):
        return HttpResponse(status=403)
    
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return HttpResponse(status=404)
        
    if request.method == 'GET':
        query_set = Private.objects.filter(Q(user_from=request.user, user_to=user) | Q(user_to=request.user, user_from=user))
        serializer = PrivateSerializer(query_set.order_by('date'), many=True)
        result = {'history': serializer.data}
        result['user'] = UserSerializer(user).data
        result['user'].pop('email')
        result['user_id'] = request.user.id
        return Response(result)
        
    
@api_view(['GET'])
def messages_api(request, chat_id):
    if isinstance(request.user, AnonymousUser):
        return HttpResponse(status=403)
    try:
        chat = Chat.objects.get(pk=chat_id)
    except Chat.DoesNotExist:
        return HttpResponse(status=404)
        
    if request.method == 'GET':    
        serializer = PublicSerializer(Public.objects.filter(chat=chat).order_by('date'), many=True)
        result = {'history': serializer.data}        
        query_users = Public.objects.filter(chat=chat).values_list('user')                
        result['users'] = get_users_list(query_users)
        result['user_id'] = request.user.id
        return Response(result)   
       
    