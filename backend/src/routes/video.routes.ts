import { Router } from 'express';
import multer from 'multer';
import { uploadVideo } from '../controllers/video.controller';

const router = Router();
const upload = multer({ dest: 'uploads/temp/' });

router.post('/upload', upload.single('video'), uploadVideo);

export default router;
