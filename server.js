const express = require('express');

// Подключение express и socket

const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
});
var cors = require('cors');

//  Добовляем возможность серверу подключить сокеты 
// В переменой io будет хронитя вся информация о сокетах 

app.use(cors());
app.use(express.json());

//  Делает сайт доступным  и обходит ошибку CORS , так же дает серверу понять что в запросе POST что-то есть 


const rooms = new Map();

// Создаем .Map с комнатами в которых будут хронится комнаты с пользователями и сообщениями 

app.get("/rooms/:id", (req, res) => {
    const { id: roomId } = req.params;
    const obj = rooms.has(roomId) ?
        {
            users: [...rooms.get(roomId).get('users').values()],
            massages: [...rooms.get(roomId).get('messages').values()]
        } : { users: [], massages: [] }
    res.json(obj);
})

app.post('/rooms', (req, res) => {
    const { roomId, userName } = req.body;
    if (!rooms.has(roomId)) {
        rooms.set(
            roomId,
            new Map([
                ['users', new Map()],
                ['messages', []],
            ]),
        );
    }
    res.send();
});
// При отправке запроса на POST будет сразу проверка на наличии указаной комнаты по ID,
// если ее нет создает комнату в которой будут свойства users (что бы было удобней работать с users они буду колеекцией Map) и massage 

// СОЗДАЕМ ДЕЙСТВИЯ КОТОРЫЕ БУДУТ ВЫПОЛНЯТСЯ ПО ОПРЕДЕЛЕННОМУ ЗАПРОСУ 
// req - то что нам передал клиент 
// res - то что мы передадим клиенту 

io.on("connection", (socket) => {

    socket.on('ROOM:JOIN', ({ roomId, userName }) => {
        socket.join(roomId);
        rooms.get(roomId).get('users').set(socket.id, userName);
        const users = [...rooms.get(roomId).get('users').values()];
        socket.broadcast.to(roomId).emit("ROOM:SET_USERS", users);
    });

    socket.on('ROOM:NEW_MESSAGE', ({ roomId, userName, text }) => {
        const obj = {
            userName,
            text
        }
        rooms.get(roomId).get('messages').push(obj)
        socket.broadcast.to(roomId).emit("ROOM:SET_MESSAGE", obj);
    });

    socket.on('disconnect', () => {
        rooms.forEach((value, roomId) => {
            if (value.get('users').delete(socket.id)) {
                const users = [...value.get('users').values()];
                socket.broadcast.to(roomId).emit("ROOM:SET_USERS", users);
            }
        });
    });
})

// Когда произашло подклюенние , получаем переменную сокет которая уникальная для каждого пользователя и там будет хранится информация про каждого пользователья 
// Когда приходит запрос с клиентской стороны с типом ROOM:JOIN мы получаем данные введеные пользователем 
// После подключаем сокет к комнате по ID ,а так же передаем что в комнате созданой с помощью POST создаем ЮЗЕРА 
// Для отображения остальным участникм комннаты что кто-то вошел получаем массив имен в этой комнате и с помощью сокета показываем всем остальным 
// в этой комнате ЮЗЕРОВ 
//  При дисконекте мы проходим по Map методом forEach удаляем ушедшего  пользователся и возрощаем остальным правдивую информация о кол-во пользователей


server.listen(process.env.PORT || 8888, (err) => {
    if (err) {
        throw Error(err);
    }
    console.log("Сервер запущен!")
})

// Выбираем следить за определеным портом и оповещаем о запуске сервера 