import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import DecryptReveal from "@/components/DecryptReveal";
import { BarChart3, Users, TrendingUp, Lock, Unlock, Loader2, Search, RefreshCw, Sparkles } from "lucide-react";
import { BrowserProvider } from "ethers";
import {
  getActiveEntryCount,
  getGlobalStats,
  requestGlobalStats,
  getPositionStats,
  requestPositionStats,
  mockDecryptGlobalStats,
  mockDecryptPositionStats,
} from "@/lib/contract";

export default function StatsPage() {
  const { isConnected, chainId } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [globalStats, setGlobalStats] = useState<{ average: number; count: number; finalized: boolean } | null>(null);
  const [isRequestingGlobal, setIsRequestingGlobal] = useState(false);
  const [isWaitingForDecryption, setIsWaitingForDecryption] = useState(false);
  const [isMockDecrypting, setIsMockDecrypting] = useState(false);

  // Position stats
  const [positionFilter, setPositionFilter] = useState("");
  const [positionStats, setPositionStats] = useState<{ average: number; count: number; finalized: boolean } | null>(
    null,
  );
  const [isRequestingPosition, setIsRequestingPosition] = useState(false);

  const loadStatistics = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      const [count, stats] = await Promise.all([
        getActiveEntryCount(provider, chainId),
        getGlobalStats(provider, chainId),
      ]);

      setActiveCount(count);
      setGlobalStats(stats);
    } catch (error) {
      console.error("Error loading statistics:", error);
      toast({
        variant: "destructive",
        title: "Loading Failed",
        description: "Unable to load statistics",
      });
    } finally {
      setLoading(false);
    }
  }, [isConnected, chainId, toast]);

  useEffect(() => {
    if (isConnected) {
      loadStatistics();
    }
  }, [isConnected, loadStatistics]);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  const handleRequestGlobalStats = async () => {
    if (!isConnected) return;
    setIsRequestingGlobal(true);

    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      const tx = await requestGlobalStats(provider, chainId);
      await tx.wait();

      const isTestnet = chainId === 11155111;
      const estimatedWaitTime = isTestnet ? "3-5 minutes" : "30-60 seconds";

      toast({
        title: "Decryption Request Sent! ⏳",
        description: `Processing on ${isTestnet ? "Sepolia testnet" : "local network"}. Estimated wait: ${estimatedWaitTime}`,
        duration: 5000,
      });

      setIsRequestingGlobal(false);
      setIsWaitingForDecryption(true);

      // Poll for results
      let pollCount = 0;
      const maxPolls = 60;

      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const stats = await getGlobalStats(provider, chainId);
          if (stats.finalized) {
            clearInterval(pollInterval);
            setIsWaitingForDecryption(false);
            setGlobalStats(stats);
            toast({
              title: "🎉 Decryption Complete!",
              description: `Average salary: $${stats.average.toLocaleString()}/mo`,
              duration: 5000,
            });
          } else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setIsWaitingForDecryption(false);
            toast({
              title: "⏰ Decryption Timeout",
              description: "Decryption is taking longer than expected. Please refresh manually.",
            });
          }
        } catch (error) {
          console.error("Error polling:", error);
        }
      }, 10000);
    } catch (error: any) {
      console.error("Error requesting stats:", error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Unable to request statistics decryption",
      });
      setIsRequestingGlobal(false);
    }
  };

  const handleMockDecrypt = async () => {
    if (chainId !== 31337) return;

    setIsMockDecrypting(true);

    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      toast({
        title: "🔓 Mock Decryption Started",
        description: "Processing encrypted data on localhost...",
      });

      const result = await mockDecryptGlobalStats(provider, chainId);

      // Update the stats
      setGlobalStats({
        average: result.average,
        count: result.count,
        finalized: true,
      });

      toast({
        title: "🎉 Decryption Complete!",
        description: `Average salary: $${result.average.toLocaleString()}/mo`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Mock decryption error:", error);
      toast({
        variant: "destructive",
        title: "Decryption Failed",
        description: error.message || "Unable to decrypt statistics",
      });
    } finally {
      setIsMockDecrypting(false);
    }
  };

  const handleRequestPositionStats = async () => {
    if (!isConnected || !positionFilter.trim()) {
      toast({
        variant: "destructive",
        title: "Enter Position",
        description: "Please enter a position name to query",
      });
      return;
    }

    setIsRequestingPosition(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      // For localhost, use mock decryption directly
      if (chainId === 31337) {
        toast({
          title: "🔓 Mock Decryption Started",
          description: `Processing statistics for "${positionFilter}"...`,
        });

        const result = await mockDecryptPositionStats(provider, positionFilter, chainId);
        setPositionStats({
          average: result.average,
          count: result.count,
          finalized: true,
        });

        toast({
          title: "🎉 Position Stats Decrypted!",
          description: `Average for "${positionFilter}": $${result.average.toLocaleString()}/mo`,
        });
        setIsRequestingPosition(false);
        return;
      }

      // For Sepolia, use the normal decryption flow
      const tx = await requestPositionStats(provider, positionFilter, chainId);
      await tx.wait();

      toast({
        title: "Request Sent!",
        description: `Decrypting statistics for "${positionFilter}"`,
      });

      // Poll for position stats
      let retryCount = 0;
      const maxRetries = 12;

      const pollPositionStats = async () => {
        try {
          const stats = await getPositionStats(provider, positionFilter, chainId);
          if (stats.finalized) {
            setPositionStats(stats);
            setIsRequestingPosition(false);
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(pollPositionStats, 5000);
          } else {
            setIsRequestingPosition(false);
            toast({
              variant: "destructive",
              title: "Timeout",
              description: "Position statistics decryption timed out",
            });
          }
        } catch (error) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(pollPositionStats, 5000);
          } else {
            setIsRequestingPosition(false);
          }
        }
      };

      setTimeout(pollPositionStats, 5000);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Unable to request position statistics",
      });
      setIsRequestingPosition(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Overview Cards */}
        <StaggerContainer className="grid md:grid-cols-2 gap-6">
          <StaggerItem>
            <Card className="border-2 border-violet-100 dark:border-violet-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-600" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-12 w-24 rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-4xl font-bold text-violet-600 animate-fade-in">{activeCount}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">Submitted encrypted salary data</p>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-2 border-violet-100 dark:border-violet-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {globalStats?.finalized ? (
                    <Unlock className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-amber-600" />
                  )}
                  Statistics Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-lg font-semibold ${globalStats?.finalized ? "text-green-600" : "text-amber-600"}`}>
                  {globalStats?.finalized ? "✅ Decrypted" : "🔐 Pending Decryption"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {globalStats?.finalized ? "Average salary is public" : "Decryption request needed"}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Global Stats Card */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Card className="border-2 border-violet-100 dark:border-violet-900/50 shadow-xl overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Global Average Salary</CardTitle>
                  <CardDescription>Encrypted salary statistics from all participants</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {globalStats?.finalized ? (
                <DecryptReveal value={globalStats.average} isDecrypting={false} label="Average Monthly Salary" />
              ) : (
                <div className="text-center py-8">
                  <Lock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-6">Average salary data has not been decrypted yet</p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={handleRequestGlobalStats}
                      disabled={isRequestingGlobal || isWaitingForDecryption || activeCount === 0}
                      className="bg-gradient-to-r from-violet-600 to-purple-600"
                    >
                      {isRequestingGlobal || isWaitingForDecryption ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isWaitingForDecryption ? "Waiting for decryption..." : "Requesting..."}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Unlock className="h-4 w-4 mr-2" />
                          Request Decryption
                        </span>
                      )}
                    </Button>

                    {chainId === 31337 && (
                      <Button
                        onClick={handleMockDecrypt}
                        variant="outline"
                        className="border-violet-200"
                        disabled={isMockDecrypting}
                      >
                        {isMockDecrypting ? (
                          <span className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Decrypting...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Mock Decrypt (Localhost)
                          </span>
                        )}
                      </Button>
                    )}
                  </div>

                  {activeCount === 0 && (
                    <p className="text-sm text-amber-600 mt-4">⚠️ No data available. Please submit salary first.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={loadStatistics} variant="ghost" size="sm" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Position Stats Card */}
        <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Card className="border-2 border-violet-100 dark:border-violet-900/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">Position Salary Statistics</CardTitle>
                  <CardDescription>Query average salary by job position</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    placeholder="Enter position name, e.g., Software Engineer"
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleRequestPositionStats} disabled={isRequestingPosition || !positionFilter.trim()}>
                  {isRequestingPosition ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {positionStats?.finalized && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 animate-fade-in">
                  <p className="text-sm text-muted-foreground mb-1">"{positionFilter}" Average Salary</p>
                  <p className="text-3xl font-bold text-blue-600">${positionStats.average.toLocaleString()}/mo</p>
                  <p className="text-sm text-muted-foreground mt-1">{positionStats.count} participants</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
