export declare class AIEmailService {
    private openai;
    constructor();
    private createChatCompletion;
    generateStatusUpdate(shipmentData: any): Promise<string>;
    generateCarrierCheckIn(shipmentData: any, checkInType: 'phone' | 'email' | 'text' | string): Promise<string>;
}
//# sourceMappingURL=emailService.d.ts.map