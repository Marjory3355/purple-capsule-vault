import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { Lock, DollarSign, TrendingUp, Shield, BarChart3, Briefcase, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "Salary and position data are encrypted using FHE before being stored on-chain",
      color: "text-violet-600",
    },
    {
      icon: TrendingUp,
      title: "Average Salary Statistics",
      description: "Calculate average salaries on encrypted data, only publish statistical results",
      color: "text-blue-600",
    },
    {
      icon: BarChart3,
      title: "Position-Based Statistics",
      description: "View average salaries by job position to understand industry compensation levels",
      color: "text-green-600",
    },
  ];

  const steps = [
    {
      icon: Briefcase,
      title: "Submit Encrypted Salary",
      description: "Enter your position and monthly salary, data is encrypted in browser using FHE before submission",
    },
    {
      icon: Shield,
      title: "On-Chain Encrypted Storage",
      description: "Smart contract accumulates and calculates statistics on all encrypted salary data",
    },
    {
      icon: TrendingUp,
      title: "Decrypt Average Salary",
      description: "When decryption is requested, only average salary and participant count are revealed",
    },
  ];

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <section className="text-center space-y-8 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-sm font-semibold"
          >
            <Shield className="h-5 w-5" />
            Powered by Zama FHEVM - Fully Homomorphic Encryption
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold"
          >
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
              Salary Vault
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Encrypt your <span className="text-violet-600 font-semibold">salary</span> and{" "}
            <span className="text-violet-600 font-semibold">position</span> data
            <br />
            View <span className="text-purple-600 font-semibold">average salary</span> statistics while protecting personal privacy
          </motion.p>

          {!isConnected ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 max-w-md mx-auto"
            >
              <p className="text-amber-800 dark:text-amber-300 font-semibold flex items-center justify-center gap-2">
                <Lock className="h-5 w-5" />
                Please connect your wallet to get started
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                onClick={() => navigate("/submit")}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Submit Salary Data
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-900/20"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                View Dashboard
              </Button>
            </motion.div>
          )}
        </section>

        {/* Features Section */}
        <StaggerContainer className="grid md:grid-cols-3 gap-6 py-12">
          {features.map((feature, index) => (
            <StaggerItem key={index}>
              <Card className="border-2 hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-300 h-full">
                <CardHeader>
                  <feature.icon className={`h-12 w-12 ${feature.color} mb-4`} />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* How It Works Section */}
        <section className="py-12">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-12"
          >
            How It Works
          </motion.h2>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <step.icon className="h-6 w-6 text-violet-600" />
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        {isConnected && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="py-12"
          >
            <Card className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
              <CardContent className="p-8 md:p-12 relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2 justify-center md:justify-start">
                      <Sparkles className="h-6 w-6" />
                      Ready to Get Started?
                    </h3>
                    <p className="text-white/80 text-lg">
                      Submit your encrypted salary data and participate in anonymous statistics
                    </p>
                  </div>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => navigate("/submit")}
                    className="bg-white text-violet-600 hover:bg-white/90 shadow-lg"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}
      </div>
    </PageTransition>
  );
}
