const express = require('express');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

// we will upload the image using this middleware and they are stored in public/img/users

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.route('/me').get(userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.userUploadPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
// photo is the name of the field in specified in postman or browser while uploading
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
