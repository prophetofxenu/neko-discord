import roomCreationRequestImageResposne, { SELECT_RESOLUTION_ID } from './room-creation-request-image-response';
import roomCreationRequestPasswordResponse from './room-creation-request-password-response';
import roomCreationRequestResolutionResponse from './room-creation-request-resolution-response';


export function matchSelectMenu(id: string) {
  switch (id) {
    case 'imageSelect':
      return roomCreationRequestImageResposne;
    case 'resolutionSelect':
      return roomCreationRequestResolutionResponse;
    default:
      throw `Unknown select menu id "${id}"`;
  }
}


export function matchModal(id: string) {
  switch(id) {
    case 'passwordModal':
      return roomCreationRequestPasswordResponse;
    default:
      throw `Unknown modal id "${id}"`;
  }
}
