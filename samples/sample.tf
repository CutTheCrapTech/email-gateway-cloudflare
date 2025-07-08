# variables.tf
variable "email_config" {
  description = "Email configuration in human-readable format"
  type = map(object({
    email = string
    secrets = list(object({
      key     = string
      enabled = bool
      name    = optional(string, "")
    }))
  }))
}

# locals.tf
locals {
  email_config_compacted = jsonencode({
    for user_key, user_config in var.email_config : substr(user_key, 0, 1) => {
      s = [
        for secret in user_config.secrets : {
          k = secret.key
          e = secret.enabled
        }
      ]
      e = user_config.email
    }
  })
}

# main.tf
resource "cloudflare_worker_secret" "email_config" {
  account_id  = var.cloudflare_account_id
  name        = "EMAIL_CONFIG"
  script_name = cloudflare_worker_script.email_handler.name
  secret_text = local.email_config_compressed
}
