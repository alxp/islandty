const MediaWithTracksModel = require('./MediaWithTracksModel.js');

class AudioContentModel extends MediaWithTracksModel {
  constructor() {
    super('media:audio:field_track');
  }
}

module.exports = AudioContentModel;
