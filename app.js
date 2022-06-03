const express = require('express');
const cookieParser = require('cookie-parser');
const { errors, Joi, celebrate } = require('celebrate');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const {
  createUsers,
  login,
} = require('./controllers/users');
const auth = require('./middlewares/auth');
const NotFoundError = require('./errors/NotFound');

const app = express();
const { PORT = 3000 } = process.env;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
const limiterRegister = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
});

mongoose.connect('mongodb://127.0.0.1/mestodb');

app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(limiter);

app.post('/signin', celebrate({
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8),
  }),
}), login);
app.post('/signup', limiterRegister, celebrate({
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8),
    name: Joi.string().min(2).max(30),
    about: Joi.string().min(2).max(30),
    avatar: Joi.string().regex(/^(http(s)?:\/\/)(?:www\.|(?!www))+[\w\-._~:/?#[\]@!$&'()*+,;=]+#?$/),
  }),
}), createUsers);

app.use(auth);
app.use('/users', require('./routes/users'));
app.use('/cards', require('./routes/cards'));

app.use((req, res, next) => {
  next(new NotFoundError('Sorry, page not found'));
});

app.use(errors());

app.use((err, req, res, next) => {
  const { statusCode = 500, message } = err;
  res.status(statusCode).send({ message: statusCode === 500 ? 'Server Error' : message });
  next();
});

app.listen(PORT);
