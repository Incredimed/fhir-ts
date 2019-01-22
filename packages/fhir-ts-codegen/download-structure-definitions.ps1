Get-Content .\structure-definitions-profiles-r4.txt | ForEach-Object {
    # Write-Host "URL: " $args
    # Write-Host $_
    # Write-Host "URL: " $args[0]

    # $destinationFolder = "structure-definitions-r4/"

    # Start-Job {
        #Write-Host "Test";

        function Save-TinyUrlFile
        {
            PARAM (
                $TinyUrl,
                $DestinationFolder
            )
            
            Write-Host "Downloading: $TinyUrl to file location: $DestinationFolder"

            $response = Invoke-WebRequest -Uri $TinyUrl
            $filename = [System.IO.Path]::GetFileName($response.BaseResponse.ResponseUri.OriginalString)
            $filepath = [System.IO.Path]::Combine($DestinationFolder, $filename)

            try
            {
                Write-Host "Downloaded: $filename to file location: $filepath"

                $filestream = [System.IO.File]::Create($filepath)
                $response.RawContentStream.WriteTo($filestream)
                $filestream.Close()
            }
            finally
            {
                if ($filestream)
                {
                    $filestream.Dispose();
                }
            }
        }

        # function DownloadFile([Object[]] $sourceFiles, [string]$targetDirectory) {            
        #     $wc = New-Object System.Net.WebClient            
                    
        #     foreach ($sourceFile in $sourceFiles){            
        #         $sourceFileName = $sourceFile.SubString($sourceFile.LastIndexOf('/')+1)            
        #         $targetFileName = $targetDirectory + $sourceFileName            
        #         $wc.DownloadFile($sourceFile, $targetFileName)
        #         Write-Host "Downloaded $sourceFile to file location $targetFileName"             
        #     } 
        # }

        # Save-TinyUrlFile -TinyUrl ("http://build.fhir.org/" + $args[0] + ".profile.json") -DestinationFolder $args[1]
        Save-TinyUrlFile -TinyUrl ("http://build.fhir.org/" + $_.ToLower() + ".profile.json") -DestinationFolder "structure-definitions-r4\"
    #} -ArgumentList $_, "structure-definitions-r4/"
}