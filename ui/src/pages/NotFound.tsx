import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-violet-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="text-9xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent"
        >
          404
        </motion.div>
        
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground max-w-md">
          Sorry, the page you are looking for does not exist or has been removed.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-violet-600 to-purple-600"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
