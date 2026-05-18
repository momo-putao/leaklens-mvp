import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const review = body.review;
  return NextResponse.json({
    payload: {
      title: `LeakLens 审批建议：${review?.title ?? "未命名材料"}`,
      riskLevel: review?.riskLevel,
      score: review?.score,
      summary: review?.summary,
      remediationTasks: review?.remediationTasks ?? [],
      reportText: body.reportText ?? "",
      callbackUrl: body.callbackUrl ?? "",
      channels: {
        feishuWebhook: body.feishuWebhook ?? "",
        wecomWebhook: body.wecomWebhook ?? "",
        smtp: body.smtp ?? ""
      }
    }
  });
}
