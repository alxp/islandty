const MediaWithTracksModel = require('./MediaWithTracksModel.js');

class VideoContentModel extends MediaWithTracksModel {
  constructor() {
    super('media:video:field_track');
  }
}

module.exports = VideoContentModel;
