const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get all the tour data
  const tours = await Tour.find();
  // 2) Build the template using the tour data
  // 3) render the template build using above tours
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) get the tour according to the slug
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'user rating review'
  });
  if (!tour) {
    return next(new AppError('Their is no tour with that name', 404));
  }
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log in to your account'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updateUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updateUser
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) from the bookings find all the tours that user has booked using his user id
  const bookings = await Booking.find({ user: req.user.id });

  // 2) using the booking data in grap all the tour ids
  const tourIds = bookings.map(el => el.tour);

  // 2) now we have the tour ids we will get all the tours
  const tours = await Tour.find({ _id: { $in: tourIds } });
  // $in operator will check through array of tourIds

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });

  next();
});
