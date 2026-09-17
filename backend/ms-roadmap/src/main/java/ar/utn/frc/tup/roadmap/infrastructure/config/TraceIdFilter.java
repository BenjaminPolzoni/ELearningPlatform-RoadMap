package ar.utn.frc.tup.roadmap.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Filtro que extrae el trace ID de los headers que el Gateway ya inyectó
 * y lo pone en el MDC de SLF4P para que aparezca en cada línea de log.
 *
 * Headers consumidos (ya validados por IdentityPropagationFilter del Gateway):
 * - traceparent (W3C Trace Context, formato 00-<traceId>-<spanId>-<flags>)
 * - X-Request-Id (UUID de correlación de la request)
 *
 * Si alguno no viene (dev local sin Gateway), genera un UUID fallback.
 */
@Component
public class TraceIdFilter extends OncePerRequestFilter {

    private static final String TRACEPARENT = "traceparent";
    private static final String REQUEST_ID = "X-Request-Id";
    private static final String MDC_TRACE_ID = "traceId";
    private static final String MDC_REQUEST_ID = "requestId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            // traceparent: 00-<traceId>-<spanId>-<flags> → extraer traceId
            String traceparent = request.getHeader(TRACEPARENT);
            String traceId;
            if (traceparent != null && traceparent.length() >= 55) {
                traceId = traceparent.substring(3, 35); // 32 hex chars = 128-bit
            } else {
                traceId = UUID.randomUUID().toString().replace("-", "");
            }

            String requestId = request.getHeader(REQUEST_ID);
            if (requestId == null) {
                requestId = UUID.randomUUID().toString();
            }

            MDC.put(MDC_TRACE_ID, traceId);
            MDC.put(MDC_REQUEST_ID, requestId);
            response.setHeader(REQUEST_ID, requestId);

            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_TRACE_ID);
            MDC.remove(MDC_REQUEST_ID);
        }
    }
}
