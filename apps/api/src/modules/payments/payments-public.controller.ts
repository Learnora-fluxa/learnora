import { Controller, Get, Headers, HttpCode, Post, Query, Req, Res } from '@nestjs/common'
import { PaymentsService } from './payments.service.js'

@Controller('payments')
export class PaymentsPublicController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhooks/paystack')
  @HttpCode(200)
  handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string | undefined,
    @Req() req: { rawBody?: Buffer; body?: unknown },
  ) {
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))

    return this.paymentsService.handlePaystackWebhook(signature, rawBody)
  }

  @Get('callback/paystack')
  handlePaystackCallback(
    @Query('reference') reference: string | undefined,
    @Query('trxref') trxref: string | undefined,
    @Res() res: { redirect: (url: string) => void },
  ) {
    res.redirect(this.paymentsService.getPaystackCallbackRedirect(reference, trxref))
  }
}
