const express = require('express');

const reviewController = require('../controllers/reviewController');

const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// post /tourId/reviews will be redirect here and and then post method
// but this won't get access to TourId param because the post here has the / in param
// to get it we have to merge params in router to get the entire route

// get /tourId/reviews will be redirect here and then get method
router.use(authController.protect);
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserId,
    reviewController.createReview
  );
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
