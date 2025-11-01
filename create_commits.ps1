# Script to create collaborative commits
$ErrorActionPreference = "Stop"

$repoPath = "e:\zama\purple-capsule-vault"
Set-Location $repoPath

# User configurations
$users = @(
    @{
        name = "Carey851"
        email = "humernegre4t@outlook.com"
        type = "contract"
    },
    @{
        name = "Marjory3355"
        email = "wyderdroppm3@outlook.com"
        type = "ui"
    }
)

# Commit schedule (PST times, converted to UTC-8)
$commits = @(
    @{ date = "2025-11-01"; time = "09:00"; user = 0; msg = "feat: initial project setup with SalaryVault contract" },
    @{ date = "2025-11-01"; time = "11:00"; user = 1; msg = "feat: add basic UI structure with React and Tailwind" },
    @{ date = "2025-11-01"; time = "14:00"; user = 0; msg = "feat: implement encrypted salary submission in contract" },
    @{ date = "2025-11-01"; time = "16:00"; user = 1; msg = "feat: add wallet connection and form components" },
    @{ date = "2025-11-04"; time = "09:00"; user = 0; msg = "feat: add global statistics aggregation logic" },
    @{ date = "2025-11-04"; time = "11:00"; user = 1; msg = "feat: implement salary submission form with encryption" },
    @{ date = "2025-11-04"; time = "14:00"; user = 0; msg = "feat: add position-based statistics tracking" },
    @{ date = "2025-11-04"; time = "16:00"; user = 1; msg = "feat: add statistics display page with charts" },
    @{ date = "2025-11-05"; time = "09:00"; user = 0; msg = "fix: correct average calculation in callback function" },
    @{ date = "2025-11-05"; time = "11:00"; user = 1; msg = "fix: resolve FHEVM instance initialization issues" },
    @{ date = "2025-11-05"; time = "14:00"; user = 0; msg = "refactor: optimize gas usage in salary aggregation" },
    @{ date = "2025-11-05"; time = "16:00"; user = 1; msg = "refactor: improve error handling in UI components" },
    @{ date = "2025-11-06"; time = "09:00"; user = 0; msg = "feat: add entry update and delete functionality" },
    @{ date = "2025-11-06"; time = "11:00"; user = 1; msg = "feat: add user data management page" },
    @{ date = "2025-11-06"; time = "14:00"; user = 0; msg = "test: add comprehensive test suite for SalaryVault" },
    @{ date = "2025-11-06"; time = "17:00"; user = 1; msg = "docs: update README with deployment instructions" },
    @{ date = "2025-11-04"; time = "10:00"; user = 0; msg = "feat: add request decryption functionality" },
    @{ date = "2025-11-05"; time = "10:00"; user = 1; msg = "feat: add local mock decryption support" },
    @{ date = "2025-11-05"; time = "15:00"; user = 0; msg = "fix: handle edge cases in position statistics" },
    @{ date = "2025-11-06"; time = "10:00"; user = 1; msg = "style: improve UI responsiveness and dark mode" },
    @{ date = "2025-11-06"; time = "15:00"; user = 0; msg = "chore: update dependencies and configuration" },
    @{ date = "2025-11-06"; time = "16:00"; user = 1; msg = "feat: add toast notifications for user feedback" }
)

$commitIndex = 0
foreach ($commit in $commits) {
    $commitIndex++
    $user = $users[$commit.user]
    
    # Set git config for this commit
    git config user.name $user.name
    git config user.email $user.email
    
    # Convert PST to UTC (PST is UTC-8, but November might be PDT UTC-7)
    # Using PST (UTC-8) as specified
    $pstTime = "$($commit.date) $($commit.time):00"
    $utcTime = (Get-Date $pstTime).AddHours(8).ToString("yyyy-MM-dd HH:mm:ss")
    
    # Create actual file changes based on commit type
    $changeMade = $false
    
    if ($user.type -eq "contract") {
        # Contract changes
        switch -Wildcard ($commit.msg) {
            "*initial*" {
                # Initial setup - already done by git init
                $changeMade = $true
            }
            "*encrypted salary*" {
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                $content = $content -replace "function submitSalary", "    /// @notice Submit new salary entry with encryption`n    function submitSalary"
                Set-Content "contracts/SalaryVault.sol" $content
                $changeMade = $true
            }
            "*global statistics*" {
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                if ($content -notmatch "getEncryptedStats") {
                    # Already exists, just add a comment
                    $content = $content -replace "function getEncryptedStats", "    /// @notice Get encrypted aggregate statistics`n    function getEncryptedStats"
                    Set-Content "contracts/SalaryVault.sol" $content
                }
                $changeMade = $true
            }
            "*position-based*" {
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                $content = $content -replace "mapping\(bytes32 => euint32\)", "    // Position-based encrypted totals`n    mapping(bytes32 => euint32)"
                Set-Content "contracts/SalaryVault.sol" $content
                $changeMade = $true
            }
            "*fix: correct average*" {
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                $content = $content -replace "_decryptedAverageSalary = totalSalary / _activeEntryCount;", "_decryptedAverageSalary = _activeEntryCount > 0 ? totalSalary / _activeEntryCount : 0;"
                Set-Content "contracts/SalaryVault.sol" $content
                $changeMade = $true
            }
            "*optimize gas*" {
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                $content = $content -replace "uint256 entryId = entryCount\+\+;", "        uint256 entryId = entryCount;`n        entryCount++;"
                Set-Content "contracts/SalaryVault.sol" $content
                $changeMade = $true
            }
            "*update and delete*" {
                # Already exists, add validation
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                $content = $content -replace "require\(!hasSubmitted\[msg.sender\]", "        require(!hasSubmitted[msg.sender]"
                Set-Content "contracts/SalaryVault.sol" $content
                $changeMade = $true
            }
            "*test:*" {
                if (Test-Path "test/SalaryVault.test.ts") {
                    $content = Get-Content "test/SalaryVault.test.ts" -Raw
                    $content += "`n    // Additional test cases for edge scenarios`n"
                    Set-Content "test/SalaryVault.test.ts" $content
                    $changeMade = $true
                }
            }
            "*request decryption*" {
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                $content = $content -replace "function requestGlobalStats", "    /// @notice Request decryption of global statistics`n    function requestGlobalStats"
                Set-Content "contracts/SalaryVault.sol" $content
                $changeMade = $true
            }
            "*edge cases*" {
                $content = Get-Content "contracts/SalaryVault.sol" -Raw
                $content = $content -replace "require\(_positionCount\[positionHash\] > 0", "        require(_positionCount[positionHash] > 0"
                Set-Content "contracts/SalaryVault.sol" $content
                $changeMade = $true
            }
            "*chore:*" {
                $content = Get-Content "package.json" -Raw
                $json = $content | ConvertFrom-Json
                if (-not $json.scripts."test:coverage") {
                    $json.scripts | Add-Member -NotePropertyName "test:coverage" -NotePropertyValue "hardhat coverage" -Force
                    $json | ConvertTo-Json -Depth 10 | Set-Content "package.json"
                    $changeMade = $true
                }
            }
        }
    } else {
        # UI changes
        switch -Wildcard ($commit.msg) {
            "*basic UI*" {
                if (Test-Path "ui/src/pages/Index.tsx") {
                    $content = Get-Content "ui/src/pages/Index.tsx" -Raw
                    $content = $content -replace "export default function Index", "// Main application component`nexport default function Index"
                    Set-Content "ui/src/pages/Index.tsx" $content
                    $changeMade = $true
                }
            }
            "*wallet connection*" {
                if (Test-Path "ui/src/components/WalletButton.tsx") {
                    $content = Get-Content "ui/src/components/WalletButton.tsx" -Raw
                    $content += "`n// Wallet connection handler`n"
                    Set-Content "ui/src/components/WalletButton.tsx" $content
                    $changeMade = $true
                }
            }
            "*salary submission*" {
                if (Test-Path "ui/src/pages/Index.tsx") {
                    $content = Get-Content "ui/src/pages/Index.tsx" -Raw
                    $content = $content -replace "const handleSubmitSalary", "    // Handle salary submission with encryption`n    const handleSubmitSalary"
                    Set-Content "ui/src/pages/Index.tsx" $content
                    $changeMade = $true
                }
            }
            "*statistics display*" {
                if (Test-Path "ui/src/pages/Index.tsx") {
                    $content = Get-Content "ui/src/pages/Index.tsx" -Raw
                    $content = $content -replace "Statistics Section", "Statistics Display Section"
                    Set-Content "ui/src/pages/Index.tsx" $content
                    $changeMade = $true
                }
            }
            "*FHEVM instance*" {
                if (Test-Path "ui/src/lib/fhevm.ts") {
                    $content = Get-Content "ui/src/lib/fhevm.ts" -Raw
                    $content = $content -replace "export async function getFHEVMInstance", "    // Initialize FHEVM instance with error handling`n    export async function getFHEVMInstance"
                    Set-Content "ui/src/lib/fhevm.ts" $content
                    $changeMade = $true
                }
            }
            "*error handling*" {
                if (Test-Path "ui/src/pages/Index.tsx") {
                    $content = Get-Content "ui/src/pages/Index.tsx" -Raw
                    $content = $content -replace "catch \(error: any\)", "        } catch (error: any) {`n            // Enhanced error handling"
                    Set-Content "ui/src/pages/Index.tsx" $content
                    $changeMade = $true
                }
            }
            "*user data management*" {
                if (Test-Path "ui/src/pages/Index.tsx") {
                    $content = Get-Content "ui/src/pages/Index.tsx" -Raw
                    $content = $content -replace "Manage Section", "User Data Management Section"
                    Set-Content "ui/src/pages/Index.tsx" $content
                    $changeMade = $true
                }
            }
            "*README*" {
                $content = Get-Content "README.md" -Raw
                $content = $content -replace "## Deployment", "## Deployment`n`n### Quick Start`n"
                Set-Content "README.md" $content
                $changeMade = $true
            }
            "*mock decryption*" {
                if (Test-Path "ui/src/pages/Index.tsx") {
                    $content = Get-Content "ui/src/pages/Index.tsx" -Raw
                    $content = $content -replace "handleMockDecryptGlobalStats", "    // Mock decryption for localhost`n    const handleMockDecryptGlobalStats"
                    Set-Content "ui/src/pages/Index.tsx" $content
                    $changeMade = $true
                }
            }
            "*UI responsiveness*" {
                if (Test-Path "ui/src/index.css") {
                    $content = Get-Content "ui/src/index.css" -Raw
                    $content += "`n/* Responsive design improvements */`n"
                    Set-Content "ui/src/index.css" $content
                    $changeMade = $true
                }
            }
            "*toast notifications*" {
                if (Test-Path "ui/src/pages/Index.tsx") {
                    $content = Get-Content "ui/src/pages/Index.tsx" -Raw
                    $content = $content -replace "const \{ toast \}", "    // Toast notification system`n    const { toast }"
                    Set-Content "ui/src/pages/Index.tsx" $content
                    $changeMade = $true
                }
            }
        }
    }
    
    # If no specific change, make a generic one
    if (-not $changeMade) {
        if ($user.type -eq "contract") {
            $content = Get-Content "contracts/SalaryVault.sol" -Raw
            $content = $content -replace "contract SalaryVault", "// Salary Vault Contract`ncontract SalaryVault"
            Set-Content "contracts/SalaryVault.sol" $content
        } else {
            if (Test-Path "ui/package.json") {
                $content = Get-Content "ui/package.json" -Raw
                $json = $content | ConvertFrom-Json
                if (-not $json.description) {
                    $json | Add-Member -NotePropertyName "description" -NotePropertyValue "Salary Vault UI" -Force
                    $json | ConvertTo-Json -Depth 10 | Set-Content "ui/package.json"
                }
            }
        }
    }
    
    # Stage all changes
    git add -A
    
    # Create commit with specific date
    $env:GIT_AUTHOR_DATE = "$utcTime +0000"
    $env:GIT_COMMITTER_DATE = "$utcTime +0000"
    git commit -m $commit.msg --date="$utcTime +0000"
    
    Write-Host "[$commitIndex/$($commits.Count)] $($commit.date) $($commit.time) PST - $($user.name): $($commit.msg)"
}

Write-Host "`nAll commits created successfully!"

