import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import router from "./app/routes";
import bodyParser from "body-parser";
import { cancel } from "./shared/cancel";
import { success } from "./shared/success";
// import { success } from "./shared/cancel";

const app: Application = express();

export const corsOptions = {
  origin: [
    "http://localhost:3001",
    "http://localhost:3000",
    "https://mayuranpadayach-client.vercel.app",
    "https://dashboard.timelifyadmin.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "Origin",
    "Cache-Control",
    "X-CSRF-Token",
    "User-Agent",
    "Content-Length",
  ],
  credentials: true,
};

// Rate limiter middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  keyGenerator: (req: any) => {
    // Extract IP address from the X-Forwarded-For header safely
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
      const ipArray = forwardedFor.split(/\s*,\s*/);
      return ipArray.length > 0 ? ipArray[0] : req.connection.remoteAddress;
    }
    // fallback
    return (req.connection && req.connection.remoteAddress) || req.ip || "unknown";
  },
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Important: capture raw body BEFORE any body parser that consumes the stream.
// Use body-parser with verify to keep rawBody for signature verification (PayFast IPN).
app.use(
  bodyParser.urlencoded({
    extended: true,
    verify: (req: any, _res, buf) => {
      // Save raw body string for signature verification (only for urlencoded posts)
      req.rawBody = buf.toString("utf8");
    },
  })
);

// Also capture raw JSON body (if you ever expect JSON webhooks)
app.use(
  bodyParser.json({
    verify: (req: any, _res, buf) => {
      // Only set rawBody if not already set by urlencoded parser
      req.rawBody = req.rawBody || buf.toString("utf8");
    },
  })
);

// Other middleware (cookies, static, cors)
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(cookieParser());
app.use(express.static("public"));

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.send({  
    success: true,
    statusCode: httpStatus.OK,
    message: "The server is running!",
  });
});

// Rate limit only for API routes
app.use("/api/v1", apiLimiter, router);
app.use('/payment/success', apiLimiter, (req, res) => {

  res.send(success);
});
app.use('/payment/cancel', apiLimiter, (req, res) => {

  res.send(cancel);
});

// Global error handler
app.use(GlobalErrorHandler);

// Not found handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;