import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('formats HttpException with its status and message', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('Account not found'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 404, message: 'Account not found', path: '/test' }),
    );
  });

  it('exposes validation messages as errors[]', () => {
    const { host, status, json } = mockHost();
    filter.catch(new BadRequestException(['amount must be positive', 'date is required']), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation failed',
        errors: ['amount must be positive', 'date is required'],
      }),
    );
  });

  it('hides details of unexpected errors behind a 500', () => {
    const { host, status, json } = mockHost();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(new Error('db password leaked in stack'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error' }));
  });
});
