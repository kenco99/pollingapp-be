import express from 'express';
import {isTeacherOnline, getUser, updateUser, getQuestion} from '../controllers/pollapp';

const router = express.Router();

router.get("/teacher-online", isTeacherOnline);
router.get("/user", getUser);
router.put("/user", updateUser);
router.get("/question", getQuestion);

export default router;
