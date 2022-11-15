from django.contrib.auth.models import User
from faker import Faker


def fillbase():
    fake = Faker(['ru_RU'])
    count_user=100

    for _ in range(count_user):
        profile = fake.simple_profile()
        fio = profile['name'].split(' ')
        
        user = User.objects.create(
            username=profile['username'],	
            first_name=fio[1],	
            last_name=fio[0],
            is_active=True,
            email=profile['mail'], 
            is_superuser=False
        )
        user.set_password(user.username)
        user.save()