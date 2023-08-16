import express, { response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import * as userController from './controllers/userController';
const PORT = 10000;
const app= express();
import * as posts from './routes/posts'
import * as users from './routes/users'

app.use(cors({
    credentials:true,
}));
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
  }));
app.use(bodyParser.json());

app.use('/v1',posts.getRouter());
app.use('/v1',users.getRouter());
 
app.listen(PORT, () => {
    console.log("Server listening on PORT", PORT);
});
