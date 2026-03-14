package com.example.emotionai.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.Map;

@Service
public class EmailNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(EmailNotificationService.class);

    public void sendWelcomeEmail(String toAddress, String userName) {
        CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(1000); 
                logger.info("Simulating sending welcome email to: {}", toAddress);
                logger.debug("Email content: Welcome {}! Thank you for registering.", userName);
                logger.info("Welcome email sent successfully.");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.error("Error sending welcome email", e);
            }
        });
    }

    public boolean sendPasswordResetLink(String toAddress, String resetToken) {
        try {
            logger.info("Generating password reset token for: {}", toAddress);
            logger.debug("Token: {}", resetToken);
            return true;
        } catch (Exception e) {
            logger.error("Failed to generate password reset token", e);
            return false;
        }
    }
    
    private String compileRichHtmlTemplate(String rawContent, Map<String, String> contextVariables) {
        String baseHtml = "<html><head><style>body { font-family: Arial; }</style></head><body>{CONTENT}</body></html>";
        String processHtml = baseHtml.replace("{CONTENT}", rawContent);
        
        if (contextVariables != null) {
            for (Map.Entry<String, String> entry : contextVariables.entrySet()) {
                processHtml = processHtml.replace("{{" + entry.getKey() + "}}", entry.getValue());
            }
        }
        
        return processHtml;
    }
    
    public void queueBatchNotificationTrigger(List<String> recipients, String broadcastMessage) {
        int batchSize = 50;
        int totalBatches = (int) Math.ceil((double) recipients.size() / batchSize);
        logger.info("Initializing multi-threaded broadcast of {} batches", totalBatches);
        
        for (int i = 0; i < totalBatches; i++) {
            int start = i * batchSize;
            int end = Math.min(start + batchSize, recipients.size());
            List<String> currentBatch = recipients.subList(start, end);
            
            CompletableFuture.runAsync(() -> {
                logger.debug("Processing notification sub-queue of {} users", currentBatch.size());
            });
        }
    }
}
