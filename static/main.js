
const getCookie=(name)=> { // Нужна для чтения  csrftoken
   const matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ))
    return matches ? decodeURIComponent(matches[1]) : undefined
}

const formatDateTime=(date, s=false) =>{
	let d=new Date(date)	
	return ("0" + d.getDate()).slice(-2) + "." 
		+ ("0"+(d.getMonth()+1)).slice(-2) + "." 
		+ d.getFullYear() + " " 
		+ ("0" + d.getHours()).slice(-2) + ":" 
		+ ("0" + d.getMinutes()).slice(-2) 
		+ ((s) ? ":" + ("0" + d.getSeconds()).slice(-2) : "");
}

const getServerData = async(url)=>{ // Реализуем GET запрос
    return fetch(url)
      .then((response) => {
            if (response.status===403){
                window.location.href='/accounts/login/'
                return
            }
            return response.json(); 
      })
      .then((data) => { return data; })
      .catch(() => { return null });
}

const sendServerData = async(url, data)=>{ // Отправляем данные методом POST
    const options={
        method: "POST",
        body: JSON.stringify(data),
        headers: {   "Content-type": "application/json; charset=UTF-8", "X-CSRFToken": getCookie('csrftoken')  }
    }
    return fetch(url, options)
      .then((response) => { return response.json(); })
      .then((data) => { return data; })
      .catch(() => { return null });
}

const openChat = async ({id, name, description, is_my})=>{ //Открываем чат
    const frm = document.getElementById('message-form')
    frm.querySelector('input[name=chat_id]').value = id
    frm.querySelector('input[name=user_id]').value = null
    document.getElementById('list-title').innerHTML = name 
    document.getElementById('list-description').innerHTML = description || ''
    document.getElementById('room-menu-header').className = 'is-active'
    document.getElementById('human-menu-header').className = ''
    const editBth = document.getElementById('edit-button-chat')
    editBth.style.display = (is_my) ? 'block' : 'none'
    
    for (let item of document.querySelectorAll('.user-menu-item')) item.className = 'user-menu-item'
    for (let item of document.querySelectorAll('.chat-menu-item')){
        item.className = 'chat-menu-item' + ((item.id.split('-')[1]==id) ? " selected-item" : "")
    }
    
    if (is_my){ //Если чат наш, то настроим форму редактирования        
        editBth.addEventListener('click', (ev)=>editChat(ev, {id: id, name: name, description: description}))
    }
    
    sessionStorage.setItem('current', 'chat-'+id)
    
    const data = await getServerData('chat/'+id);
    if (!data) return;
    
    const list = document.querySelector('.messages-list')
    list.innerHTML = ''    
    data.history.forEach(e=>{
        const user = data.users.find(u=>u.id===e.user) || {}
        console.log(data.users)
        renderMessage(list, e, user, data.user_id)
    })
    sendActive(null, id)
}

const openPrivateChat = async ({id, name})=>{// Открываем личную переписку
    const frm = document.getElementById('message-form')
    frm.querySelector('input[name=chat_id]').value = null
    frm.querySelector('input[name=user_id]').value = id
    document.getElementById('list-title').innerHTML = name 
    document.getElementById('list-description').innerHTML = ''
    document.getElementById('room-menu-header').className = ''
    document.getElementById('human-menu-header').className = 'is-active'
    document.getElementById('edit-button-chat').style.display = 'none'
    
    for (let item of document.querySelectorAll('.chat-menu-item')) item.className = 'chat-menu-item'
    for (let item of document.querySelectorAll('.user-menu-item')){
        item.className = 'user-menu-item' + ((item.id.split('-')[1]==id) ? " selected-item" : "")
    }
    sessionStorage.setItem('current', 'user-'+id)
        
    const data = await getServerData('private/'+id);
    if (!data) return;
    
    const list = document.querySelector('.messages-list')
    list.innerHTML = ''    
    data.history.forEach(async e=>{
        await renderMessage(list, e, data.user, data.user_id)
    })
    sendActive(id, null)   
}

const renderMessage= async(parentList, data, user, user_id)=>{
    const template = document.getElementById('template-row-message').cloneNode(true)
    template.id=''     
    template.style.display = 'flex'
    const recvUserId = data.user_from || data.user
    user = user || JSON.parse(sessionStorage.getItem('user-data-'+recvUserId))
    if (!user) { //Если нет данных о пользователе, попробуем найти в кэше
        const userList = await getServerData('users/?id='+recvUserId)
        if (userList && userList.length){
            user = userList[0]
            sessionStorage.setItem('user-data-'+recvUserId, JSON.stringify(user))            
        }
    }
    
    template.setAttribute('userEmpty', (!user.length) ? 1 : 0)
    
    let userLogin = user.username
    let userName = user.first_name +' '+user.last_name
    
    let avatar = sessionStorage.getItem('avatar-'+user.username)
    if (!avatar){        
        avatar = 'data:image;base64,'+user.avatar
        sessionStorage.setItem('avatar-'+user.username, avatar)
    }
    console.log(data)
    console.log(user_id)
    if(data.user_from==user_id || data.user==user_id){
        avatar = sessionStorage.getItem('avatar-'+window.userData.username)
        template.classList.add('my')
        template.querySelector('.user-message').classList.add('my')
        template.querySelector('.reply-user').style.display = 'none'
        userLogin = window.userData.username
        userName = window.userData.first_name +' '+ window.userData.last_name
    }   
    template.querySelector('.fullname').innerHTML = userName
    template.querySelector('.username').innerHTML = '@'+userLogin
    template.querySelector('.usertime').innerHTML = formatDateTime(data.date, true)
    template.querySelector('.message-text').innerHTML = data.message
    
    template.querySelector("img").src = avatar
    template.querySelector(".reply-user").addEventListener('click', ()=>{
        const frm=document.getElementById('message-form')
        frm.querySelector('.textarea[name=message]').value += userName+', '
        frm.querySelector('.textarea[name=message]').focus()
        
    })
       
    parentList.appendChild(template) 
}

const deleteChat = async (ev, {id, name})=>{  //Удаляем чат
    if (confirm(`Вы действительно хотите удалить комнату '${name}' со всей перепиской!`) == true){
        const options={  
            method: 'DELETE',
            headers: {   "Content-type": "application/json; charset=UTF-8", "X-CSRFToken": getCookie('csrftoken')  }
        }
        fetch('chats/'+id, options)
            .then((response) => { return response.json(); })
            .then((data) => { 
                loadChats()
            })
            .catch(() => { return null });
    }
}

const loadChats=async()=>{  // Загрузка списка чатов и личных переписок
    const data = await getServerData('my/chats');
    if (!data) return;
    
    const tmpChats = JSON.parse(sessionStorage.getItem('temp-chats') || '[]')
    tmpChats.forEach(e=>{
        if(!data.public.find(f=>f.id===e.id)) data.public.push({...e})
    }) 
    const tmpUsers = JSON.parse(sessionStorage.getItem('temp-users') || '[]')
    tmpUsers.forEach(e=>{
        if(!data.private.find(f=>f.id===e.id)) data.private.push({...e, username: e.name})
    }) 
    
    let current = sessionStorage.getItem('current')
    
    
    // Отображаем комнаты
    let menu = document.getElementById('room-menu').querySelector('.child-menu')
    menu.innerHTML = ''
    data.public.forEach(e=>{
        let color = 'has-text-warning'
        let trash = ''
        if (e.is_my){
            color = 'has-text-success'
            trash = '<div title="Удалить комнату"><a class="trash"><i class="fas fa-trash has-text-danger"></i></a></div>'
        }
        
        //Отображение текущего чата при перазагрузке страницы
        if (!current) { 
            current = 'chat-'+e.id
            sessionStorage.setItem('current', current)
        }     
        let selected = ''
        if (current == 'chat-'+e.id){
            selected = 'selected-item'
            openChat({...e})
        }
        
        const li = document.createElement('li')        
        li.title = e.description
        li.innerHTML = `<div style="display:flex">
                        <div class='chat-menu-item ${selected}' id="chat-${e.id}"><a class='item'>
                            <span class="icon is-small ${color}">
                            <i class="fas fa-comments"></i>
                            </span> ${e.name}
                        </a></div>
                        ${trash}
                    </div>`  
        menu.appendChild(li)
        li.querySelector('a[class=item]').addEventListener('click', (ev)=> openChat({...e}))
        if (e.is_my) li.querySelector('a[class=trash]').addEventListener('click', (ev)=> deleteChat(ev, {...e}))
    })

    // Отображаем личную переписку
    menu = document.getElementById('human-menu').querySelector('.child-menu')
    menu.innerHTML = ''
    data.private.forEach(e=>{
        const name = e.username + ((e.first_name) ? ' ('+e.first_name+' '+e.last_name+')' : '')
        //Отображение текущего чата при перазагрузке страницы
        if (!current) {
            current = 'user-'+e.id
            sessionStorage.setItem('current', current)
        } 
        let selected = ''
        if (current == 'user-'+e.id){
            selected = 'selected-item'
            openPrivateChat({id: e.id, name: name})
        }
        
        const li = document.createElement('li')
        li.innerHTML = `<div class='user-menu-item ${selected}' id="user-${e.id}"><a>
                    <span class="icon is-small has-text-info">
                    <i class="fas fa-envelope"></i></span> ${name}
                </a></div>`
        li.querySelector('a').addEventListener('click', (ev)=> openPrivateChat({id: e.id, name: name}))  
        menu.appendChild(li)        
    }) 

    document.querySelector('.message-box').style.display = (current) ? 'flex' : 'none'
}

const loadProfile= async(data)=>{ // Загрузка данные профиля пользователя и заполнение DOM
    data = data || await getServerData('my');
    if (!data) return;
    
    for (let el of document.getElementsByClassName('user-name-field')){
        el.innerHTML = data.username
    }
    const frm = document.getElementById('profile-form')
    for (let key in data){
        const field = frm.querySelector('input[name='+key+']')
        if (field) field.value = data[key]
        window.userData={...data}
    }
    if (data.avatar) {
        const ava = 'data:image;base64,'+data.avatar
        document.getElementById("edit-avatar").src = ava        
        sessionStorage.setItem('avatar-'+data.username, ava);
    }
    loadChats()
}


const showProfile = async(ev)=>{    // Показать окно профиля
    ev.preventDefault()       
    document.getElementById('profile-window').style.display='flex'
}

const closeModal=(id)=>document.getElementById(id).style.display='none'; //Закрытие модальных окон

const handleSendProfile = async(ev)=>{ // Отправляем данные профили на сервер
    const showError=(msg)=>{
        const message = document.getElementById('error-profile')
        message.style.display=(msg) ? 'block' : 'none'
        message.innerHTML = msg 
    }
    showError(null)    
    ev.preventDefault()
    const data = {}
    for (let el of ev.target.querySelectorAll('input')){
        if (el.value) data[el.name] = el.value
    }
    
    if (!data.password && data.new_password){
        showError('Введите текущий пароль')
        return
    } 
    if (data.password && !data.new_password){
        showError('Новый пароль не может быть пустым')
        return
    }
    if (data.password && data.new_password && data.new_password!=data.new_password1){
        showError('Подтверждение нового пароля не совпадает')
        return
    }    
    const res = await sendServerData('my/', data)
    if (res){
        if (!res.error) {
            res.password=''
            res.new_password=''
            res.new_password1=''
            await loadProfile(res);
            closeModal('profile-window')
        }else showError(res.error)        
    }else showError('Неизвестная ошибка')
}


const loadAvatar=()=>{ //Загружаем картинку аватара на клиент
    const image_input = document.createElement('input');
    image_input.type='file'
    image_input.accept="image/png, image/gif, image/jpeg"
    image_input.addEventListener("change", ()=> {
          const reader = new FileReader();
          reader.addEventListener("load", () => {
            const uploaded_image = reader.result;
            document.getElementById("edit-avatar").src = uploaded_image;
            document.getElementById('profile-form').querySelector('input[name=avatar]').value = uploaded_image.split('base64,')[1]
          });
          reader.readAsDataURL(image_input.files[0]);
    });
    image_input.click()
}

const addChat= async (ev, type, id, name)=>{ //Добавляем комнату или пользователя в меню
    ev.preventDefault()
    const key = 'temp-'+type
    const values = JSON.parse(sessionStorage.getItem(key) || '[]')
    values.push({id: id, name: name})
    sessionStorage.setItem(key, JSON.stringify(values))
    closeModal('modal-window')
    sessionStorage.setItem('current', ((type=='users') ? 'user' : 'chat')+'-'+id)
    loadChats()
}

const editChat= async (ev, data)=>{ // Модальное окно редактирования команты
    ev.preventDefault()
    const id = 'modal-window-chat'
    let win = document.getElementById(id)     
    for (let el of win.querySelectorAll('.data-form'))        
        el.value=(data) ? data[el.name] : null        
    win.style.display='flex' 
}


const showSelectChat = async (type, show)=>{ // Окно выбора по команты или пользователя
    data = await getServerData(type);
    if (!data) return;   
    const win = document.getElementById('modal-window')
    win.querySelector('.modal-title').innerHTML=(type=='users') ? 'Пользователи' : 'Комнаты'
    
    const winBody =  win.querySelector('.modal-card-body')
    winBody.innerHTML=''
    const list = document.createElement('nav')
    list.className = 'panel win-modal-data' 
    winBody.appendChild(list)
    
    if(type=='chats'){
        const a = document.createElement('a')
        a.className = 'panel-block'
        a.innerHTML = '<span class="panel-icon  has-text-success"><i class="fas fa-plus" aria-hidden="true"></i></span> Создать'
        a.addEventListener('click', editChat)
        list.appendChild(a)
    }
    
    data.forEach(row=>{
        const is_active='is-active'
        let icon = ''
        let text = ''
        if (type=='users'){            
            text = row.username + ((row.first_name) ? ' ('+row.first_name+' '+row.last_name+')' : '')
            icon = 'user'
        }else {
            text = row.name
            icon = 'comments'
        }
        
        const a = document.createElement('a')
        a.className = 'panel-block '+is_active
        a.innerHTML = `<span class="panel-icon">
              <i class="fas fa-${icon}" aria-hidden="true"></i>
            </span>
            ${text}`
        a.addEventListener('click', (ev)=> addChat(ev, type, row.id, text))
        list.appendChild(a)
    })
    if (show) win.style.display='flex' 
}

const showHumans=async(ev)=>{ // Вызываем модальное окно выбора пользователя для приватной переписки
    ev.preventDefault() 
    await showSelectChat('users', true)          
}

const showRooms=async(ev)=>{ //Вызываем модальное окно выбора новой комнаты
    ev.preventDefault() 
    await showSelectChat('chats', true)
}


const handleUpdateChat = async(ev)=>{ //Создание и редактирование комнаты
    const showError=(msg)=>{
        const message = document.getElementById('error-chat')
        message.style.display=(msg) ? 'block' : 'none'
        message.innerHTML = msg 
    }
    showError(null)    
    ev.preventDefault()
    
    const data = {'user': null}
    for (let el of ev.target.querySelectorAll('.data-form')){
        if (el.value) data[el.name] = el.value
    }
    
    const res = await sendServerData('chats/', data)
    if (res){
        if (!res.error) {
            closeModal('modal-window-chat')
            loadChats()
            await showSelectChat('chats')
        }else showError(res.error)        
    }else showError('Неизвестная ошибка')
}

const handleSubmitMessage = async(ev)=>{ //Отправка сообщения
    ev.preventDefault()
    const frm = document.getElementById('message-form')
    const message = frm.querySelector('textarea[name=message]').value
    if (message.trim() == '') return
    const data = {
        chat: frm.querySelector('input[name=chat_id]').value,
        user: frm.querySelector('input[name=user_id]').value,
        message: message
    }
    await window.webSocket.send(JSON.stringify(data))
    frm.querySelector('textarea[name=message]').value=''
    const list = document.querySelector('.messages-list')
    const msg = {...data, date: new Date(), user: window.userData.id}
    await renderMessage(list, msg, window.userData, window.userData.id)
}

const sendActive= async (user_id, chat_id)=>{  // Перекличение активной группы для прослушки сообщения
    data = {activate: {user_id: user_id, chat_id: chat_id}}
    await window.webSocket.send(JSON.stringify(data))
}

const showPrivate=async (parentList, msg)=>{ //Отборажаем или подсвечиваем приватное сообщение    
    const current = sessionStorage.getItem('current')
    console.log(msg)
    if (current=='user-'+msg.user){
        renderMessage(parentList, msg, null, window.userData.id)
        return
    }
    const user_item = document.querySelector(`.user-menu-item[id="user-${msg.user}"]`)
    if (!user_item){        
        const userList = await getServerData('users/?id='+msg.user)
        if (userList && userList.length){
            const userData = userList[0]
            const userName = userData.username + ((userData.first_name) ? ' ('+userData.first_name+' '+userData.last_name+')' : '')
            const tmpUsers = JSON.parse(sessionStorage.getItem('temp-users') || '[]')
            tmpUsers.push({id: msg.user, name: userName})        
            sessionStorage.setItem('temp-users', JSON.stringify(tmpUsers))
        }
        loadChats()
    }
}

const initWebSocket=()=>{
    const wsUrl = 'ws://' + window.location.host + '/ws/'
    window.webSocket = new WebSocket(wsUrl);
    
    
    webSocket.onopen = (event) =>{
        document.getElementById('icon-ws').className="icon has-text-success"
    };
    
    webSocket.onclose = (event) =>{
        document.getElementById('icon-ws').className="icon has-text-danger is-light"
        webSocket=null        
    };

    webSocket.onmessage = (event) => {
        const list = document.querySelector('.messages-list')
        const msg = JSON.parse(event.data)
        if (msg.private){
            showPrivate(list, msg)
        } else 
            renderMessage(list, msg, null, window.userData.id)
    };

    webSocket.onerror = function(error) {
        console.log(error);
    };
}

window.onload=()=>{
    const btnProfile = document.getElementById('my-profile')
    const btnHumans = document.getElementById('open-humans')
    const btnRooms = document.getElementById('open-rooms')
    
    if (!btnProfile){
        sessionStorage.clear()
        return;
    }
    
    loadProfile();
    btnProfile.addEventListener('click', showProfile)
    document.getElementById('profile-form').addEventListener('submit', handleSendProfile);
    
    btnHumans.addEventListener('click', showHumans)
    btnRooms.addEventListener('click', showRooms)    
    
    document.getElementById('chat-form').addEventListener('submit', handleUpdateChat);
    document.getElementById('message-form').addEventListener('submit', handleSubmitMessage);
    
    initWebSocket()
}