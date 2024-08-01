import express from 'express';
import {isTeacherOnline, getUser, getQuestion, getSubmissions} from '../controllers/pollapp';

const router = express.Router();

router.get("/teacher-online", isTeacherOnline);
router.get("/user", getUser);
router.get("/question", getQuestion);
router.get("/submissions", getSubmissions);

export default router;
