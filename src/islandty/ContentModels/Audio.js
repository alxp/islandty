import MediaWithTracksModel from './MediaWithTracksModel.js';

class AudioContentModel extends MediaWithTracksModel {
  constructor() {
    super('media:audio:field_track');
  }
}

export default AudioContentModel;
