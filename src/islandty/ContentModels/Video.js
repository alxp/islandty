import MediaWithTracksModel from './MediaWithTracksModel.js';

class VideoContentModel extends MediaWithTracksModel {
  constructor() {
    super('media:video:field_track');
  }
}

export default VideoContentModel;
