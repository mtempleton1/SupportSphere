$testFiles = Get-ChildItem -Path "supabase/tests/database" -Filter "*.test.sql"

$jobs = @()

foreach ($file in $testFiles) {
    $jobs += Start-Job -ScriptBlock {
        param($filePath)
        Write-Host "Running test: $filePath"
        npx supabase link --project-ref hmuziybgjrbclhxtqycv -p "#1990yddub" --workdir "D:\gauntlet\SupportSphere"
        npx supabase test db $filePath --linked --workdir "D:\gauntlet\SupportSphere"
    } -ArgumentList $file.FullName
}

Write-Host "Waiting for all tests to complete..."
$jobs | Wait-Job | Receive-Job

Write-Host "All tests completed!" 