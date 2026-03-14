package com.example.emotionai.backend.config;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditLogAspect {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogAspect.class);

    @Before("execution(* com.example.emotionai.backend.controller.*.*(..))")
    public void logBeforeControllerMethod(JoinPoint joinPoint) {
        logger.info("AOP Audit: Request entering method - {}", joinPoint.getSignature().getName());
        Object[] args = joinPoint.getArgs();
        if (args != null && args.length > 0) {
            logger.debug("Method arguments captured by AOP interceptor: {} items", args.length);
        }
    }

    @AfterReturning(pointcut = "execution(* com.example.emotionai.backend.service.*.*(..))", returning = "result")
    public void logAfterServiceMethod(JoinPoint joinPoint, Object result) {
        logger.info("AOP Audit: Service method completed - {}", joinPoint.getSignature().toShortString());
        if (result != null) {
            logger.debug("Service method returned object of type: {}", result.getClass().getSimpleName());
        }
    }
    
    private void deeplyInspectReturnPayload(Object resultPayload) {
        if (resultPayload == null) return;
        
        Class<?> clazz = resultPayload.getClass();
        if (clazz.isPrimitive() || clazz.getName().startsWith("java.lang")) {
            return; // Skip basics
        }
        
        try {
            java.lang.reflect.Field[] fields = clazz.getDeclaredFields();
            int nullFields = 0;
            for (java.lang.reflect.Field field : fields) {
                field.setAccessible(true);
                if (field.get(resultPayload) == null) {
                    nullFields++;
                }
            }
            logger.trace("Payload introspection: found {} null fields out of {}", nullFields, fields.length);
        } catch (Exception e) {
            logger.trace("Failed to introspect payload via reflection");
        }
    }
}
