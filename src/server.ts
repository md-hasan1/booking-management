import { Server } from "http";
import config from "./config";
import cron from "node-cron";
import prisma from "./shared/prisma";
import app from "./app";
import { sendNotificationDailyMorning, sendReminderNotifications } from "./shared/everydaysendNotification";

let server: Server;
const NOTIFICATION_TIMEZONE = process.env.NOTIFICATION_TIMEZONE || "Africa/Johannesburg";

async function startServer() {
  server = app.listen(config.port, async() => {
    console.log("Server is listiening on port ", config.port);
    
    // Send daily morning notifications to business owners
    cron.schedule(
      "0 8 * * *",
      async () => {
        await sendNotificationDailyMorning();
      },
      {
        timezone: NOTIFICATION_TIMEZONE,
      }
    );

    // Send appointment reminder notifications (24h and 2h before)
    cron.schedule(
      // "*/5 * * * *",
      "* * * * *",
      async () => {
        await sendReminderNotifications();
      },
      {
        timezone: NOTIFICATION_TIMEZONE,
      }
    );

  });
}

async function main() {
  await startServer();
  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info("Server closed!");
        restartServer(); 
      });
    } else {
      process.exit(1);
    }
  };

  const restartServer = () => {
    console.info("Restarting server...");
    main();
  };

  process.on("uncaughtException", (error) => {
    console.log("Uncaught Exception: ", error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.log("Unhandled Rejection: ", error);
    exitHandler();
  });

  // Handling the server shutdown with SIGTERM and SIGINT
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received. Shutting down gracefully...");
    exitHandler();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT signal received. Shutting down gracefully...");
    exitHandler();
  });
}

main();
