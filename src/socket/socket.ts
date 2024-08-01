import { Server, Socket } from 'socket.io';
import {deleteJsonDataFromKey, getJsonDataFromKey, setJsonDataToKey} from '../../redis/crud';
import { v5 as uuidv5 } from 'uuid';
import {answerQuestion, createQuestion, createOrUpdateUser} from "../controllers/pollapp";

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
            }else{
                await createOrUpdateUser(generatedUUID, null, 'student')
                socket.emit('set-user', {user_type:'student', user_id:generatedUUID})
            }

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

        socket.on('create-poll', async (data: any) => {
            const user:any  = await getJsonDataFromKey(socket.id);

            await createQuestion(user.uuid, data)
            const question:any  = await getJsonDataFromKey('current-poll');

            io.emit('current-poll',
                {
                    question,
                    answer: null
                } as any)
        });

        socket.on('answer-poll', async (obj:any) => {
            let {poll_question_id, poll_option_id} = obj

            if(!poll_option_id){
                return;
            }
            const user:any  = await getJsonDataFromKey(socket.id);

            const data:{code:number, msg:string} = await answerQuestion(user.uuid, poll_question_id, poll_option_id, socket.id);

            if(data.code == 200){
                const question:any  = await getJsonDataFromKey('current-poll');
                const update_user:any  = await getJsonDataFromKey(socket.id);

                io.emit('current-poll',
                    {
                            question,
                            answer:!!update_user && update_user?.current_question? update_user:null
                    } as any)

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

            await deleteJsonDataFromKey(socket.id);
        });
    });
};
