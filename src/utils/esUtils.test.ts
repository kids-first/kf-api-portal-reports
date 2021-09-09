/* eslint-disable no-unused-expressions */
import { expect } from 'chai';

import { toSafeESValue } from './esUtils';

describe('toSafeESValue', () => {
  it('returns the value unchanged if it is safe', () => {
    const mockSafeValues = ['this string is safe', 123];
    expect(mockSafeValues.map(toSafeESValue)).to.be.eql(mockSafeValues);
  });

  it('caps position big integer values at the largest safe position integer', () => {
    // Those numbers are not arbitrary :
    // 9223372036854775808 is the max value of a UInt64 (what ES/Java use), i.e. 2^63-1
    // 9223372036854776000 is the number that results from the above number having lost precision
    //  due to coercion from string to number in elasticsearch library
    expect(toSafeESValue('9223372036854776000')).to.be.eql('9223372036854775808');
  });

  it('caps negative big integer values at the largest safe negative integer', () => {
    // Those numbers are not arbitrary :
    // -9223372036854775808 is the min value of a UInt64 (what ES/Java use), i.e. -(2^63-1)
    // -9223372036854776000 is the number that results from the above number having lost precision
    //  due to coercion from string to number in elasticsearch library
    expect(toSafeESValue('-9223372036854776000')).to.be.eql('-9223372036854775808');
  });
});
