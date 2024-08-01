import { Server, Socket } from 'socket.io';
import {deleteJsonDataFromKey, getJsonDataFromKey, setJsonDataToKey, incrementRedis} from '../../redis/crud';
import { v5 as uuidv5 } from 'uuid';
import {answerQuestion, createQuestion, createOrUpdateUser, updateUser} from "../controllers/pollapp";
export const setupSocketHandlers = (io: Server) => {
    io.use(async (socket, next) => {
        try {
            const tabID = socket.handshake.query.tabID as string;
            if(!tabID){
                return "tabID missing"
            }
            const NAMESPACE = uuidv5.DNS;
            const generatedUUID: string = uuidv5(tabID, NAMESPACE);

            await setJsonDataToKey(socket.id, {uuid:generatedUUID})
            const prev_teacher:any = await getJsonDataFromKey('previous-teacher');

            if(!!prev_teacher && prev_teacher?.uuid === generatedUUID){
                const prev_question:any = await getJsonDataFromKey('previous-poll');
                await setJsonDataToKey('current-poll', prev_question)
                await setJsonDataToKey('current-teacher', {uuid:generatedUUID})
                io.emit('teacher-status', true as any);
                socket.emit('set-user', {user_type:'teacher', user_id:generatedUUID})

                const usersOnline = await getJsonDataFromKey('users-online') || [];
                usersOnline.push({ socket_id: socket.id, uuid: generatedUUID, name: 'Teacher' });
                await setJsonDataToKey('users-online', usersOnline);
            }else{
                const user:any = await createOrUpdateUser(generatedUUID, null, 'student');
                if(user?.name) await setJsonDataToKey(socket.id, user.name, ".name");
                socket.emit('set-user', {user_type:'student', user_id:generatedUUID, user_name: user.name})

                const usersOnline = await getJsonDataFromKey('users-online') || [];
                usersOnline.push({ socket_id: socket.id, uuid: generatedUUID, name: user.name || 'Anonymous' });
                await setJsonDataToKey('users-online', usersOnline);
            }

            io.emit('users-online-updated', await getJsonDataFromKey('users-online'));

            next();

            return;
        } catch (error) {
            return;
        }
    });

    io.on('connection', async (socket: Socket) => {


        socket.on('is-teacher-online', () => {
            const teacher:any = getJsonDataFromKey('current-teacher');
            io.emit('teacher-status', !!teacher as any);
        });

        socket.on('teacher-signup', async () => {
            try{
                const user:any  = await getJsonDataFromKey(socket.id);
                await createOrUpdateUser(user.uuid, null, 'teacher')

                await setJsonDataToKey('current-teacher', {uuid:user.uuid})
                socket.emit('set-user', {user_type:'teacher', user_id:user.uuid})
                io.emit('teacher-status', true as any);
            }catch (e) {
                console.log(e)
            }
        });

        socket.on('student-signup', async () => {
            try{
                const user:any  = await getJsonDataFromKey(socket.id);
                const teacher:any = await getJsonDataFromKey('current-teacher');

                if(!!teacher && teacher.uuid === user.uuid){
                    await deleteJsonDataFromKey('current-poll');
                    await deleteJsonDataFromKey('current-teacher');
                    await deleteJsonDataFromKey('previous-teacher');
                    await deleteJsonDataFromKey('previous-poll');
                    socket.emit('set-user', {user_type:'student', user_id:user.uuid})
                    io.emit('teacher-status', false as any);
                }
            }catch (e) {
                console.log(e)
            }
        });

        socket.on('save-student-name', async (name:string) => {
            try{
                const user:any  = await getJsonDataFromKey(socket.id);

                await updateUser(user.uuid, name)
                if(name) await setJsonDataToKey(socket.id, name, ".name");
                socket.emit('set-user', {user_type:'student', user_id:user.uuid, user_name:name})

                await setJsonDataToKey('users-online', name, `$.[?(@.uuid == '${user.uuid}')].name`);
                io.emit('users-online-updated', await getJsonDataFromKey('users-online'));
            }catch (e) {
                console.log(e)
            }
        });

        socket.on('create-poll', async (data: any) => {
            const user:any  = await getJsonDataFromKey(socket.id);

            await createQuestion(user.uuid, data)
            const question:any  = await getJsonDataFromKey('current-poll');

            await setJsonDataToKey('poll-count', 0);

            io.emit('current-poll',
                {
                    question,
                    answer: null
                } as any)
            io.emit('poll-count-updated', await getJsonDataFromKey('poll-count'));
        });

        socket.on('answer-poll', async (obj:any) => {
            let {poll_question_id, poll_option_id} = obj

            if(!poll_option_id){
                return;
            }
            const user:any  = await getJsonDataFromKey(socket.id);

            const data:{code:number, msg:string} = await answerQuestion(user.uuid, poll_question_id, poll_option_id, socket.id);

            if(data.code == 200){
                await incrementRedis("poll-count", "$");
                const question:any  = await getJsonDataFromKey('current-poll');
                const update_user:any  = await getJsonDataFromKey(socket.id);

                io.emit('current-poll',
                    {
                            question,
                            answer:!!update_user && update_user?.current_question? update_user:null
                    } as any)

                io.emit('poll-count-updated', await getJsonDataFromKey('poll-count'));
            }
        });

        socket.on('reset-poll', async () => {
            const user:any  = await getJsonDataFromKey(socket.id);
            const teacher:any = await getJsonDataFromKey('current-teacher');
            if(!!teacher && teacher.uuid === user.uuid){
                await deleteJsonDataFromKey('current-poll');
                await deleteJsonDataFromKey('previous-poll');

                io.emit('current-poll',
                    {
                        question: null,
                        answer:null
                    } as any)
            }
        });

        socket.on('send-message', async (message: string) => {
            try {
                let user: any = await getJsonDataFromKey(socket.id);
                const teacher:any = await getJsonDataFromKey('current-teacher');
                if(!!teacher && teacher.uuid === user.uuid){
                    user.name = 'Teacher';
                }
                const userName = user.name || 'Anonymous';
                const chatMessage = {
                    sender: userName,
                    text: message,
                    timestamp: Date.now(),
                };
                io.emit('chat-message', chatMessage as any);
            } catch (e) {
                console.log(e);
            }
        });

        socket.on('kick-student', async (socketId: string) => {
            const user:any  = await getJsonDataFromKey(socket.id);
            const teacher:any = await getJsonDataFromKey('current-teacher');

            if(!!teacher && teacher.uuid === user.uuid){
                io.to(socketId).emit('kicked');
                io.sockets.sockets.get(socketId)?.disconnect(true);

                const usersOnline = await getJsonDataFromKey('users-online') || [];
                const updatedUsersOnline = usersOnline.filter((user:any) => user.socket_id !== socketId);
                await setJsonDataToKey('users-online', updatedUsersOnline);

                io.emit('users-online-updated', updatedUsersOnline);
            }
        });

        socket.on('disconnect', async () => {
            const user:any  = await getJsonDataFromKey(socket.id);
            const teacher:any = await getJsonDataFromKey('current-teacher');

            if(!!user && !!teacher && user?.uuid === teacher?.uuid){
                const question:any  = await getJsonDataFromKey('current-poll');
                await deleteJsonDataFromKey('current-teacher');
                await deleteJsonDataFromKey('current-poll');
                await setJsonDataToKey('previous-poll', question)
                await setJsonDataToKey('previous-teacher', {uuid:user.uuid})
                io.emit('teacher-status', false as any);
            }

            const usersOnline = await getJsonDataFromKey('users-online') || [];
            const updatedUsersOnline = usersOnline.filter((u:any) => u.socket_id !== socket.id);
            await setJsonDataToKey('users-online', updatedUsersOnline);

            io.emit('users-online-updated', updatedUsersOnline);

            await deleteJsonDataFromKey(socket.id);
        });
    });
};
