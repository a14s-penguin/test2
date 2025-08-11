// /app/api/intent-router.ts

type IntentHandlerParams = {
    intent: string;
    params: Record<string, any>;
    sessionId: string;
};

type IntentResult = {
    success: boolean;
    message: string;
};

export const intentHandlers: Record<
    string,
    (args: IntentHandlerParams) => Promise<IntentResult>
> = {
    CREATE_LEAVE_REQUEST: async ({ params }) => {
        const res = await fetch(`${process.env.BASE_URL}/api/leave-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        const data = await res.json();

        return {
            success: res.ok,
            message: data.message || 'Đã gửi yêu cầu nghỉ phép.',
        };
    },

};
