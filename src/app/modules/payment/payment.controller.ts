import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { paymentService } from './payment.service';


const initializePayment = catchAsync(async (req: Request, res: Response) => {
  // Accept optional body values (userId, email, amount, etc.). If not provided, use demo data.
  const { userId = 'user123', email = 'user123@example.com', amount, itemName, notifyUrl, returnUrl, cancelUrl } = req.body || {};

  const result = await paymentService.buySubscription({ userId, email, amount, itemName, notifyUrl, returnUrl, cancelUrl });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Debug signature generated',
    data: result,
  });
  // // Server-side redirect to the exact PayFast URL to avoid browser re-encoding issues.
  // // This is safer than returning the URL and relying on the client to open it.
  // return res.redirect(result.url);
});

const debugSignature = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.debugSubscriptionSignature();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Debug signature generated',
    data: result,
  });
});

const verifyUrl = catchAsync(async (req: Request, res: Response) => {
  const { url, query } = req.body as { url?: string; query?: string };
  const result = await paymentService.verifySignatureForUrl({ url, query });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'URL signature verification result',
    data: result,
  });
});



const handelIpn = catchAsync(async (req: Request, res: Response) => {
  // Verify signature and then perform server-to-server validation with PayFast
  const result = await paymentService.verifyAndValidateIpn(req);

  // For IPN PayFast expects HTTP 200. We still return a small JSON for visibility in dev.
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'IPN validated and handled successfully',
    data: result,
  });
});

export const paymentController = {
  initializePayment,
  handelIpn,
  debugSignature,
  verifyUrl,
};

