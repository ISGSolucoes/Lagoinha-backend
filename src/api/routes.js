import express from 'express';
import members from '../db/members.js';
import usersRouter from '../db/users.js';
import auth from '../db/auth.js';
import church from './church.js';
import situation from './situation.js';
import userType from './userType.js';
import locations from './locations.js';

const router = express.Router();

router.use("/members", members);
router.use('/auth', auth);
router.use('/church', church);
router.use('/situation', situation);
router.use('/userType', userType);
router.use('/locations', locations);

export default router;