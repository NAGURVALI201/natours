const multer = require('multer');
const sharp = require('sharp');

const Tour = require('./../models/tourModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage(); // this will create a buffer in req.file.buffer
// we will stor the data in the buffer instead of saving to disk and again reading it.
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an Image ! Please upload only images.', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image'); // for single images output at req.file
// upload.array('images'); // for multiple images for same field output at req.files
// upload.fields('images'); // for multiple images for different images output at req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) {
    return next();
  }

  // 1) image cover

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// });

exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  // radius is measure required in distance / (radius of earth) 3963.1 miles or 6378.1 km

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please specify the latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });
  // we want to get the tour which is near to the distance
  // the filter object is distance should be within the startlocation
  // geoWithin check the distance with in it for geo coordinates
  // centerSphere is like a sphere which takes lng,lat and radius w.r.t to earth
  // from that lng,lat and radius and check any start location falls within that range
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please specify the latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      // this will take a parmaeter with geocoordinates we have specified it with the index as startLocation so that is taken as parameter if we have multiple parameter we have to specify the key and parameter name.
      // geoNear should be the first one in the aggregation pipeline otherwise it will give us error.
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
        // this field will convert the distance in desired unit;

        // distance is always in metes
        // this the field in which all near point will be stored under 'distance' variables
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
