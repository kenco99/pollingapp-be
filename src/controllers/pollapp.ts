import { Request, Response } from 'express';
import {UUID} from "node:crypto";
import {getJsonDataFromKey, incrementRedis, setJsonDataToKey} from "../../redis/crud";
import {v5 as uuidv5} from "uuid";
const DB = require("../../db/models");

interface Option {
    text: string;
    isCorrect: boolean;
}

interface Question {
    question: string,
    options: Option[],
    maximum_time: number
}
export const getUser = async (req: Request, res:Response): Promise<Response<any, Record<string, any>>> => {
    try {
        const data:any = req.query
        const tabID = data.tabID;

        const NAMESPACE = uuidv5.DNS;
        const generatedUUID: string = uuidv5(tabID, NAMESPACE);

        let query = `select *
        from users u
        where u.id = :id`;

        const result:any = await DB.sequelize
            .query(query, {
                type: DB.sequelize.QueryTypes.SELECT,
                replacements: {
                    id: generatedUUID,
                },
            })

        if(result.length > 0){
            return res.status(200).json({msg:'Success', user: result[0]});
        }else{
            return res.status(404).json({msg:'User not found'});
        }
    } catch (err) {
        return res.status(500).json({msg:'Error'});
    }
};

export const isTeacherOnline = async (req: Request, res:Response): Promise<Response<any, Record<string, any>>> => {
    try {
        const teacher:any = await getJsonDataFromKey('current-teacher');

        return res.status(200).json({msg:'Success',isTeacherOnline: !!teacher});

    } catch (err) {
        return res.status(500).json({msg:'Error'});
    }
};

export const getQuestion = async (req: Request, res:Response): Promise<Response> => {
    try {
        const data:any = req.query
        const tabID = data.tabID;

        const NAMESPACE = uuidv5.DNS;
        const generatedUUID: string = uuidv5(tabID, NAMESPACE);

        const question:any  = await getJsonDataFromKey('current-poll');

        if(!!question){
            let query = `select po.fk_user_id as uuid,
                                po.fk_poll_question_id as current_question,
                                po.fk_poll_option_id as current_answer
                            from poll_submissions po
                            where po.fk_user_id = :uuid and po.fk_poll_question_id = :poll_question_id;`

            const result:any = await DB.sequelize
                .query(query, {
                    type: DB.sequelize.QueryTypes.SELECT,
                    replacements: {
                        uuid: generatedUUID,
                        poll_question_id: question?.id
                    },
                })

            if(result.length > 0){
                return res.status(200).json(
                    {msg:'Success', question: question, answer: result[0]}
                );
            }else{
                return res.status(200).json(
                    {msg:'Success', question: question, answer: null}
                );
            }
        }

        const prev_teacher:any = await getJsonDataFromKey('previous-teacher');
        if(!!prev_teacher && prev_teacher?.uuid == generatedUUID){
            const prev_question:any = await getJsonDataFromKey('previous-poll');
            return res.status(200).json(
                {msg:'Success', question: prev_question, answer: null}
            );
        }

        return res.status(200).json(
            {msg:'Success', question: null, answer: null}
        );
    } catch (err) {
        console.log(err)
        return res.status(500).json(
            {msg:'Something went wrong'}
        );
    }
};

export const getSubmissions = async (req: Request, res:Response): Promise<Response> => {
    try {
        const data:any = req.query
        const tabID = data.tabID;
        let uuid:string = data.uuid;

        if(!!uuid && !!tabID){
            return res.status(403).json({msg:'uuid or tabID is compulsory',})
        }

        if(!uuid && !!tabID){
            const NAMESPACE = uuidv5.DNS;
            uuid = uuidv5(tabID, NAMESPACE);

        }

        let query = `with pq as (select pq.*,
                   jsonb_agg(po.*) as options
            from poll_questions pq
                     inner join poll_options po on pq.id = po.fk_poll_question_id
            where pq.fk_user_id = :uuid
            group by pq.id),
     submissions as (select sub.fk_poll_question_id,
                            jsonb_agg(sub.*)                                as submissions,
                            count(sub.id)                                   as submission_count,
                            sum(case when sub.is_correct then 1 else 0 end) as correct_count
                     from (select ps.fk_poll_question_id,
                                  u.id,
                                  u.name,
                                  ps.fk_poll_option_id,
                                  po.option_text,
                                  po.is_correct
                           from poll_submissions ps
                                    inner join users u on ps.fk_user_id = u.id
                                    inner join poll_options po on ps.fk_poll_option_id = po.id) as sub
                     group by sub.fk_poll_question_id)
select pq.id,
       pq.question_text,
       pq.maximum_time,
       pq."createdAt",
       pq.options,
       s.submissions,
       s.submission_count,
       s.correct_count
from pq
         left join submissions s on pq.id = s.fk_poll_question_id;`




        const result:any = await DB.sequelize
            .query(query, {
                type: DB.sequelize.QueryTypes.SELECT,
                replacements: {
                    uuid,
                },
            })

        if(result.length > 0){
            return res.status(200).json(
                {msg:'Success', data: result}
            );
        }else{
            return res.status(200).json(
                {msg:'Success', data:[]}
            );
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json(
            {msg:'Something went wrong'}
        );
    }
};

export const updateUser = async (uuid:string, name:string): Promise<string> => {
    try {
        await DB.user.update({ name }, { where: { id: uuid } });

        return 'Success';
    } catch (err) {
        return 'Error';
    }
};

export const createOrUpdateUser = async (uuid:string, name:string|null, type: 'student'|'teacher'): Promise<void> => {
    try {
        const [{dataValues: result}, created] = await DB.user
            .findOrCreate({
                where: {
                    id: uuid,
                },
                defaults: {
                    id: uuid,
                    name,
                    is_student: type == 'student'
                },
            })

        if(!created){
            await DB.user.update(
                {
                    name:!!name?name:undefined,
                    is_student: type == 'student'
                }, { where: { id: uuid } });
        }

        return result;
    } catch (err) {
        console.error(err);
        return;
    }
};

export const createQuestion = async (fk_user_id:UUID, question: Question): Promise<void> => {
    try {
        const [{dataValues: result}, created] = await DB.poll_question
            .findOrCreate({
                where: {
                    fk_user_id, question_text: question.question,
                },
                defaults: {
                    fk_user_id,
                    question_text: question.question,
                    maximum_time: question?.maximum_time || 60
                },
            })

        const options = question.options.map((option: Option) => {
            return {
                fk_poll_question_id: result.id,
                option_text: option.text,
                is_correct: option.isCorrect,
            }
        })

        let options_db:any[] = await DB.poll_option.bulkCreate(options);

        options_db = options_db.map((option: any) => {
            return {
                id: option.id,
                fk_poll_question_id: option.fk_poll_question_id,
                option_text: option.option_text,
                is_correct: option.is_correct,
                count: 0
            }
        })

        await setJsonDataToKey('current-poll',
            {
                    id: result.id,
                    question_text: question.question,
                    maximum_time: question?.maximum_time || 60,
                    options_db,
                    start_time: new Date()
            }
        )

        return;
    } catch (err) {
        console.log(err)
        return;
    }
};

export const answerQuestion = async (fk_user_id:UUID, fk_poll_question_id:number, fk_poll_option_id:number, socket_id:string): Promise<any> => {
    try {
        const [{dataValues: result}, created] = await DB.poll_submission
            .findOrCreate({
                where: {
                    fk_user_id, fk_poll_question_id
                },
                defaults: {
                    fk_user_id,
                    fk_poll_question_id,
                    fk_poll_option_id
                },
            })

        if(created){
            await setJsonDataToKey(socket_id, {
                uuid: fk_user_id,
                current_question: fk_poll_question_id,
                current_answer: fk_poll_option_id
            })

            await incrementRedis(
                "current-poll",
                `$.options_db[?(@.id == ${fk_poll_option_id})].count`
            );

            return {code:200, msg:"Voted"}
        }else {
            return {code:400, msg:"Already voted"}
        }
        return;
    } catch (err) {
        console.log(err)
        return {code:500, msg:"Something went wrong"};
    }
};


