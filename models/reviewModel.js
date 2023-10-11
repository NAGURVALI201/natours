// review / rating /createdAt // ref to tour // ref to user parent reference
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cant be empty.!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a Tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a User.']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name'
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo'
  //   });

  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

// statics methods to calculate the avgratings
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  // this means the current model reviewSchema
  const stats = await this.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.post('save', function() {
  // this will refer to the current review document.
  // we will pass the current review tour value which is tour id.
  // this.constructor refers to the current Schema of the document.

  this.constructor.calcAverageRatings(this.tour);
});

// findByIdUpdate
// findByIdDelete
// these do not have access to the document but have access to the query
// the above function run findOneAndUpdate ,findOneAndDelete we use regex and pre middleware
// if we use post we cant find review in db after deleted
reviewSchema.pre(/^findOneAnd/, async function(next) {
  // we will await until query returns the documents
  this.r = await this.findOne();
  // we will pass the document to the post middleware because the post middleware has access to the same doc pre has  so we save the query result on the current document
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // we can't use findOne at this time because the query has been already executed and the document won't be available in db if it is delete
  await this.r.constructor.calcAverageRatings(this.r.tour);
});
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
