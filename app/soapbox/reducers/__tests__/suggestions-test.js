import {
  Record as ImmutableRecord,
  fromJS,
} from 'immutable';

import { SUGGESTIONS_DISMISS } from 'soapbox/actions/suggestions';

import reducer from '../suggestions';

describe('suggestions reducer', () => {
  it('should return the initial state', () => {
    const result = reducer(undefined, {});
    expect(ImmutableRecord.isRecord(result)).toBe(true);
    expect(result.items.isEmpty()).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  describe('SUGGESTIONS_DISMISS', () => {
    it('should remove the account', () => {
      const action = { type: SUGGESTIONS_DISMISS, id: '123' };

      const state = fromJS({
        items: [
          { account: '123', source: 'past_interactions' },
          { account: '456', source: 'past_interactions' },
          { account: '789', source: 'past_interactions' },
        ],
        isLoading: false,
      });

      const expected = fromJS({
        items: [
          { account: '456', source: 'past_interactions' },
          { account: '789', source: 'past_interactions' },
        ],
        isLoading: false,
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
